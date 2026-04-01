using System.Text;
using System.Threading.RateLimiting;
using FluentValidation;
using FluentValidation.AspNetCore;
using LotyApi.Data;
using LotyApi.Middleware;
using LotyApi.Services;
using LotyApi.Validators;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Serilog.Events;

// ── Serilog — konfiguracja przed buildem ─────────────────────
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
    .WriteTo.File("logs/loty-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 14,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();

    // ── Limity Kestrel ───────────────────────────────────────
    builder.WebHost.ConfigureKestrel(o =>
        o.Limits.MaxRequestBodySize = 5 * 1024 * 1024); // 5 MB

    // ── Baza danych ──────────────────────────────────────────
    builder.Services.AddDbContext<LotyDbContext>(opt =>
        opt.UseSqlite(
            builder.Configuration.GetConnectionString("DefaultConnection")
            ?? "Data Source=loty.db"));

    // ── Serwisy aplikacji ─────────────────────────────────────
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<INumeratorService, NumeratorService>();
    builder.Services.AddScoped<IOperacjaService, OperacjaService>();
    builder.Services.AddScoped<IZlecenieService, ZlecenieService>();
    builder.Services.AddScoped<IUzytkownikService, UzytkownikService>();
    builder.Services.AddScoped<IHelikopterService, HelikopterService>();
    builder.Services.AddScoped<ICzlonekZalogiService, CzlonekZalogiService>();
    builder.Services.AddScoped<ILadowiskoService, LadowiskoService>();
    builder.Services.AddScoped<ISlownikService, SlownikService>();
    builder.Services.AddHostedService<RefreshTokenCleanupService>();

    // ── FluentValidation ──────────────────────────────────────
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddValidatorsFromAssemblyContaining<LoginValidator>();

    // ── JWT ───────────────────────────────────────────────────
    var jwtKey = builder.Configuration["Jwt:SecretKey"]
        ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
        ?? throw new InvalidOperationException(
            "Brak konfiguracji Jwt:SecretKey w appsettings ani zmiennej środowiskowej JWT_SECRET_KEY. " +
            "Ustaw zmienną: export JWT_SECRET_KEY=\"<min-32-znaki-losowego-klucza>\"");

    if (jwtKey.Length < 32)
        throw new InvalidOperationException("JWT SecretKey musi mieć co najmniej 32 znaki.");

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(opt =>
        {
            opt.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer           = true,
                ValidateAudience         = true,
                ValidateLifetime         = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer              = builder.Configuration["Jwt:Issuer"],
                ValidAudience            = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey         = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtKey)),
                ClockSkew                = TimeSpan.FromSeconds(30)
            };
        });

    builder.Services.AddAuthorization();

    // ── Rate Limiting ─────────────────────────────────────────
    var loginLimit = builder.Configuration.GetValue("RateLimiting:LoginPermitLimit", 5);
    var loginWindow = builder.Configuration.GetValue("RateLimiting:LoginWindowMinutes", 1);

    builder.Services.AddRateLimiter(opt =>
    {
        opt.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        opt.AddFixedWindowLimiter("login", o =>
        {
            o.PermitLimit = loginLimit;
            o.Window = TimeSpan.FromMinutes(loginWindow);
            o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            o.QueueLimit = 0;
        });
    });

    // ── Kontrolery z konfiguracją JSON ────────────────────────
    builder.Services.AddControllers(opt =>
        {
            // Globalny filtr [Authorize] — każdy endpoint wymaga uwierzytelnienia,
            // chyba że oznaczony [AllowAnonymous].
            opt.Filters.Add(new Microsoft.AspNetCore.Mvc.Authorization.AuthorizeFilter());
        })
        .AddJsonOptions(opt =>
        {
            opt.JsonSerializerOptions.PropertyNamingPolicy =
                System.Text.Json.JsonNamingPolicy.CamelCase;
            opt.JsonSerializerOptions.DefaultIgnoreCondition =
                System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        });

    // ── Swagger ───────────────────────────────────────────────
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title       = "Loty API",
            Version     = "v1",
            Description = "REST API do ewidencji planowanych operacji lotniczych i zleceń na lot.\n\n" +
                          "**Uwierzytelnianie:** Bearer JWT (POST /api/auth/login)"
        });

        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Name         = "Authorization",
            Type         = SecuritySchemeType.Http,
            Scheme       = "bearer",
            BearerFormat = "JWT",
            In           = ParameterLocation.Header,
            Description  = "Wklej token JWT uzyskany z /api/auth/login"
        });

        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                        { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                },
                []
            }
        });

        var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);
    });

    // ── CORS ──────────────────────────────────────────────────
    builder.Services.AddCors(opt =>
    {
        opt.AddPolicy("Dev", p => p
            .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                         ?? ["http://localhost:5173"])
            .AllowAnyHeader()
            .AllowAnyMethod());
        opt.AddPolicy("Prod", p => p
            .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
            .WithHeaders("Content-Type", "Authorization")
            .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE"));
    });

    // ── Health checks ─────────────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<LotyDbContext>("sqlite");

    var app = builder.Build();

    // ── Security headers ─────────────────────────────────────
    app.Use(async (context, next) =>
    {
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["X-XSS-Protection"] = "0";
        context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        await next();
    });

    // ── Middleware pipeline ───────────────────────────────────
    app.UseMiddleware<ExceptionHandlingMiddleware>();

    app.UseSerilogRequestLogging(opt =>
    {
        opt.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} → {StatusCode} ({Elapsed:0.0}ms)";
    });

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Loty API v1");
            c.DisplayRequestDuration();
        });
        app.UseCors("Dev");
    }
    else
    {
        app.UseCors("Prod");
        app.UseHsts();
    }

    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    // Health check — publiczny endpoint bez szczegółów
    app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
    {
        ResponseWriter = async (context, report) =>
        {
            context.Response.ContentType = "application/json";
            var result = new { status = report.Status.ToString() };
            await context.Response.WriteAsJsonAsync(result);
        }
    }).AllowAnonymous();

    // ── DB Init — migracje EF Core ──────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<LotyDbContext>();

        // Zastosuj wszystkie oczekujące migracje.
        // Przy pierwszym uruchomieniu na istniejącej bazie wykonaj:
        //   dotnet ef migrations add InitialCreate
        //   dotnet ef database update
        // Schemat zarządzany wyłącznie przez migracje — nie używamy EnsureCreated ani raw SQL.
        db.Database.Migrate();

        // Tabela licznikowa — tworzona bezpiecznie niezależnie od stanu migracji.
        // CREATE TABLE IF NOT EXISTS jest idempotentne — nie nadpisze istniejącej tabeli.
        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS numeratory (
                prefix TEXT NOT NULL,
                rok    INTEGER NOT NULL,
                ostatnia_wartosc INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (prefix, rok)
            );
            """);

        // Synchronizacja numeratorów z istniejącymi danymi w tabelach docelowych.
        // Zapobiega kolizji UNIQUE gdy numerator startuje od 0, a tabela ma już rekordy.
        db.Database.ExecuteSqlRaw("""
            INSERT INTO numeratory (prefix, rok, ostatnia_wartosc)
            SELECT 'OP', CAST(SUBSTR(numer, 4, 4) AS INTEGER),
                   MAX(CAST(SUBSTR(numer, 9) AS INTEGER))
            FROM planowane_operacje
            WHERE numer LIKE 'OP-____-%'
            GROUP BY SUBSTR(numer, 4, 4)
            ON CONFLICT(prefix, rok) DO UPDATE
                SET ostatnia_wartosc = MAX(ostatnia_wartosc, excluded.ostatnia_wartosc);
            """);

        db.Database.ExecuteSqlRaw("""
            INSERT INTO numeratory (prefix, rok, ostatnia_wartosc)
            SELECT 'ZL', CAST(SUBSTR(numer, 4, 4) AS INTEGER),
                   MAX(CAST(SUBSTR(numer, 9) AS INTEGER))
            FROM zlecenia_na_lot
            WHERE numer LIKE 'ZL-____-%'
            GROUP BY SUBSTR(numer, 4, 4)
            ON CONFLICT(prefix, rok) DO UPDATE
                SET ostatnia_wartosc = MAX(ostatnia_wartosc, excluded.ostatnia_wartosc);
            """);

        var connStr = db.Database.GetConnectionString() ?? "";
        var maskedConnStr = System.Text.RegularExpressions.Regex.Replace(
            connStr, @"(?i)(password|pwd)\s*=\s*[^;]*", "$1=***");
        Log.Information("Baza danych: {Source} (migracje zastosowane)", maskedConnStr);
    }

    Log.Information("Aplikacja uruchomiona w trybie {Env}", app.Environment.EnvironmentName);
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Aplikacja zakończyła się nieoczekiwanie.");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
