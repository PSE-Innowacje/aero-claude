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

    // ── Baza danych ──────────────────────────────────────────
    builder.Services.AddDbContext<LotyDbContext>(opt =>
        opt.UseSqlite(
            builder.Configuration.GetConnectionString("DefaultConnection")
            ?? "Data Source=loty.db"));

    // ── Serwisy aplikacji ─────────────────────────────────────
    builder.Services.AddScoped<IAuthService, AuthService>();
    builder.Services.AddScoped<INumeratorService, NumeratorService>();

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
    builder.Services.AddControllers()
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
            .AllowAnyHeader()
            .AllowAnyMethod());
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

    // Health check — publiczny endpoint bez szczegółów, szczegółowy z autoryzacją
    app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
    {
        ResponseWriter = async (context, report) =>
        {
            context.Response.ContentType = "application/json";
            var result = new { status = report.Status.ToString() };
            await context.Response.WriteAsJsonAsync(result);
        }
    });

    // ── DB Init ───────────────────────────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<LotyDbContext>();
        db.Database.EnsureCreated();

        // Dodaj tabelę refresh_tokens jeśli nie istnieje (istniejąca baza)
        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT NOT NULL,
                uzytkownik_id INTEGER NOT NULL,
                utworzono_utc TEXT NOT NULL,
                wygasa_utc TEXT NOT NULL,
                odwolano_utc TEXT NULL,
                zastapione_przez TEXT NULL,
                FOREIGN KEY (uzytkownik_id) REFERENCES uzytkownicy(Id) ON DELETE CASCADE
            )
            """);
        db.Database.ExecuteSqlRaw("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_token_unique ON refresh_tokens(token)
            """);
        db.Database.ExecuteSqlRaw("""
            CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON refresh_tokens(uzytkownik_id)
            """);
        db.Database.ExecuteSqlRaw("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_operacje_numer_unique ON planowane_operacje(numer)
            """);
        db.Database.ExecuteSqlRaw("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_zlecenia_numer_unique ON zlecenia_na_lot(numer)
            """);

        Log.Information("Baza danych: {Source}",
            db.Database.GetConnectionString());
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
