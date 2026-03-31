using LotyApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace LotyApi.Tests.Services;

/// <summary>
/// Testy AuthService ograniczone do metod nie wymagających bazy danych:
/// HashPassword i VerifyPassword.
/// </summary>
public class AuthServicePasswordTests
{
    // AuthService wymaga DbContext i IConfiguration, ale metody hash/verify
    // nie korzystają z bazy — tworzymy minimalną instancję tylko dla tych testów.
    private readonly IAuthService _service;

    public AuthServicePasswordTests()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "test-secret-key-that-is-long-enough-32chars",
                ["Jwt:Issuer"] = "test",
                ["Jwt:Audience"] = "test",
                ["Jwt:AccessTokenMinutes"] = "30",
                ["Jwt:RefreshTokenDays"] = "7"
            })
            .Build();

        var dbOptions = new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<LotyApi.Data.LotyDbContext>()
            .UseInMemoryDatabase("AuthServiceTests_" + Guid.NewGuid())
            .Options;
        var db = new LotyApi.Data.LotyDbContext(dbOptions);

        _service = new AuthService(db, config, NullLogger<AuthService>.Instance);
    }

    [Fact]
    public void HashPassword_ReturnsNonEmptyString()
    {
        var hash = _service.HashPassword("MySecret@123");

        Assert.NotNull(hash);
        Assert.NotEmpty(hash);
    }

    [Fact]
    public void HashPassword_DifferentHashes_ForSameInput()
    {
        // BCrypt uses random salt — each call produces a different hash
        var hash1 = _service.HashPassword("MySecret@123");
        var hash2 = _service.HashPassword("MySecret@123");

        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void VerifyPassword_CorrectPassword_ReturnsTrue()
    {
        var password = "MySecret@123";
        var hash = _service.HashPassword(password);

        Assert.True(_service.VerifyPassword(password, hash));
    }

    [Fact]
    public void VerifyPassword_WrongPassword_ReturnsFalse()
    {
        var hash = _service.HashPassword("MySecret@123");

        Assert.False(_service.VerifyPassword("WrongPassword!", hash));
    }

    [Fact]
    public void VerifyPassword_EmptyPassword_ReturnsFalse()
    {
        var hash = _service.HashPassword("MySecret@123");

        Assert.False(_service.VerifyPassword("", hash));
    }

    [Fact]
    public void VerifyPassword_CaseSensitive()
    {
        var hash = _service.HashPassword("MySecret@123");

        Assert.False(_service.VerifyPassword("mysecret@123", hash));
    }

    [Fact]
    public void HashAndVerify_RoundTrip_WorksForVariousPasswords()
    {
        var passwords = new[]
        {
            "Simple1@",
            "VeryLongPassword123!@#$%^",
            "Ąćęłóśźż1@",   // unicode chars
            "12345678A@a"
        };

        foreach (var password in passwords)
        {
            var hash = _service.HashPassword(password);
            Assert.True(_service.VerifyPassword(password, hash),
                $"Round-trip failed for password: {password}");
        }
    }
}
