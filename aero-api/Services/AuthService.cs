using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.IdentityModel.Tokens;

namespace LotyApi.Services;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginDto dto, CancellationToken ct = default);
    Task<LoginResponseDto?> RefreshAsync(string refreshToken, CancellationToken ct = default);
    Task RevokeAsync(string refreshToken, CancellationToken ct = default);

    /// <summary>Centralne hashowanie hasła — jeden workFactor w całej aplikacji.</summary>
    string HashPassword(string plainText);

    /// <summary>Weryfikacja hasła.</summary>
    bool VerifyPassword(string plainText, string hash);
}

public class AuthService(LotyDbContext db, IConfiguration config, ILogger<AuthService> logger) : IAuthService
{
    private const int BcryptWorkFactor = 12;

    public string HashPassword(string plainText) =>
        BCrypt.Net.BCrypt.HashPassword(plainText, workFactor: BcryptWorkFactor);

    public bool VerifyPassword(string plainText, string hash) =>
        BCrypt.Net.BCrypt.Verify(plainText, hash);

    public async Task<LoginResponseDto?> LoginAsync(LoginDto dto, CancellationToken ct)
    {
        var user = await db.Uzytkownicy
            .Include(u => u.Rola)
            .FirstOrDefaultAsync(u => u.Email == dto.Email && u.Aktywny, ct);

        if (user is null || !VerifyPassword(dto.Haslo, user.HasloHash))
            return null;

        var accessToken = GenerujAccessToken(user);
        var (plainToken, _) = await GenerujRefreshTokenAsync(user.Id, ct);

        var userDto = new UzytkownikDto(
            user.Id, user.Imie, user.Nazwisko, user.Email,
            user.RolaId, user.Rola.Nazwa, user.Aktywny);

        return new LoginResponseDto(accessToken, plainToken, userDto);
    }

    public async Task<LoginResponseDto?> RefreshAsync(string refreshToken, CancellationToken ct)
    {
        var tokenHash = HashToken(refreshToken);

        var stored = await db.RefreshTokens
            .Include(rt => rt.Uzytkownik).ThenInclude(u => u.Rola)
            .FirstOrDefaultAsync(rt => rt.Token == tokenHash, ct);

        if (stored is null || !stored.JestAktywny)
        {
            // Jeśli token został już wykorzystany → potencjalna kradzież → odwołaj całą rodzinę
            if (stored is not null && stored.OdwolanoUtc is not null)
            {
                logger.LogWarning(
                    "Próba ponownego użycia refresh tokena użytkownika {UserId} — odwołuję wszystkie tokeny",
                    stored.UzytkownikId);
                await OdwolajWszystkieTokenyAsync(stored.UzytkownikId, ct);
            }
            return null;
        }

        var user = stored.Uzytkownik;
        if (!user.Aktywny) return null;

        // Rotacja w transakcji: odwołaj stary + wygeneruj nowy atomowo
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var (plainToken, newTokenHash) = await GenerujRefreshTokenAsync(user.Id, ct);
        stored.OdwolanoUtc = DateTime.UtcNow;
        stored.ZastapionePrzez = newTokenHash;
        await db.SaveChangesAsync(ct);

        await tx.CommitAsync(ct);

        var accessToken = GenerujAccessToken(user);
        var userDto = new UzytkownikDto(
            user.Id, user.Imie, user.Nazwisko, user.Email,
            user.RolaId, user.Rola.Nazwa, user.Aktywny);

        return new LoginResponseDto(accessToken, plainToken, userDto);
    }

    public async Task RevokeAsync(string refreshToken, CancellationToken ct)
    {
        var tokenHash = HashToken(refreshToken);

        var stored = await db.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == tokenHash, ct);

        if (stored is not null && stored.JestAktywny)
        {
            stored.OdwolanoUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    // ── Helpers ───────────────────────────────────────────────

    private string GenerujAccessToken(Uzytkownik user)
    {
        var jwtKey = config["Jwt:SecretKey"]
            ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
            ?? throw new InvalidOperationException("Brak konfiguracji Jwt:SecretKey lub zmiennej JWT_SECRET_KEY.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var minutes = config.GetValue("Jwt:AccessTokenMinutes", 30);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Rola.Nazwa),
            new Claim("rola_id", user.RolaId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(minutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<(string Plain, string Hash)> GenerujRefreshTokenAsync(int userId, CancellationToken ct)
    {
        var plainToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var tokenHash = HashToken(plainToken);
        var days = config.GetValue("Jwt:RefreshTokenDays", 7);

        db.RefreshTokens.Add(new RefreshToken
        {
            Token = tokenHash,
            UzytkownikId = userId,
            WygasaUtc = DateTime.UtcNow.AddDays(days)
        });
        await db.SaveChangesAsync(ct);
        return (plainToken, tokenHash);
    }

    /// <summary>SHA-256 hash tokena — w bazie przechowujemy hash, klientowi zwracamy plain-text.</summary>
    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }

    private async Task OdwolajWszystkieTokenyAsync(int userId, CancellationToken ct)
    {
        var aktywne = await db.RefreshTokens
            .Where(rt => rt.UzytkownikId == userId && rt.OdwolanoUtc == null)
            .ToListAsync(ct);

        foreach (var rt in aktywne)
            rt.OdwolanoUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
    }
}
