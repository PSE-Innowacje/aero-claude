using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace LotyApi.Services;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginDto dto);
}

public class AuthService(LotyDbContext db, IConfiguration config) : IAuthService
{
    public async Task<LoginResponseDto?> LoginAsync(LoginDto dto)
    {
        var user = await db.Uzytkownicy
            .Include(u => u.Rola)
            .FirstOrDefaultAsync(u => u.Email == dto.Email && u.Aktywny);

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Haslo, user.HasloHash))
            return null;

        var token = GenerujToken(user);
        var userDto = new UzytkownikDto(user.Id, user.Imie, user.Nazwisko, user.Email, user.RolaId, user.Rola.Nazwa, user.Aktywny);
        return new LoginResponseDto(token, userDto);
    }

    private string GenerujToken(Uzytkownik user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Rola.Nazwa),
            new Claim("rola_id", user.RolaId.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
