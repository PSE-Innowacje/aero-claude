using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using LotyApi.Data;
using LotyApi.Middleware;
using LotyApi.Services;
using LotyApi.Validators;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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
        ?? throw new InvalidOperationException("Brak konfiguracji Jwt:SecretKey.");

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
                ClockSkew                = TimeSpan.Zero   // brak tolerancji wygaśnięcia
            };
        });

    builder.Services.AddAuthorization();

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

        // Dołącz komentarze XML jeśli wygenerowane
        var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);
    });

    // ── CORS ──────────────────────────────────────────────────
    builder.Services.AddCors(opt =>
    {
        opt.AddPolicy("Dev",    p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
        opt.AddPolicy("Prod",   p => p
            .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
            .AllowAnyHeader()
            .AllowAnyMethod());
    });

    // ── Health checks ─────────────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<LotyDbContext>("sqlite");

    var app = builder.Build();

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
    }

    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.MapHealthChecks("/health");

    // ── DB Init ───────────────────────────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<LotyDbContext>();
        db.Database.EnsureCreated();
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
