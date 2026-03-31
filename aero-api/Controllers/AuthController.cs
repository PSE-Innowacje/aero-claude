using LotyApi.Common;
using LotyApi.DTOs;
using LotyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LotyApi.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController(IAuthService authService) : ControllerBase
{
    /// <summary>Logowanie — zwraca access token + refresh token.</summary>
    [HttpPost("login")]
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(ApiResult<LoginResponseDto>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(429)]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await authService.LoginAsync(dto);
        if (result is null)
            return Unauthorized(ApiResult.Fail("Nieprawidłowy email lub hasło."));
        return Ok(ApiResult<LoginResponseDto>.Ok(result));
    }

    /// <summary>Odświeża access token za pomocą refresh tokena (rotacja).</summary>
    [HttpPost("refresh")]
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(ApiResult<LoginResponseDto>), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto)
    {
        var result = await authService.RefreshAsync(dto.RefreshToken);
        if (result is null)
            return Unauthorized(ApiResult.Fail("Refresh token jest nieprawidłowy lub wygasł."));
        return Ok(ApiResult<LoginResponseDto>.Ok(result));
    }

    /// <summary>Wylogowanie — odwołuje refresh token.</summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(204)]
    public async Task<IActionResult> Logout([FromBody] LogoutDto dto)
    {
        await authService.RevokeAsync(dto.RefreshToken);
        return NoContent();
    }
}

// ── Słowniki ─────────────────────────────────────────────────

[ApiController]
[Route("api/slowniki")]
[Authorize]
[Produces("application/json")]
public class SlownikiController(IAdministracjaService service) : ControllerBase
{
    [HttpGet("role-uzytkownikow")]
    [ProducesResponseType(typeof(ApiResult<List<SlownikDto>>), 200)]
    public async Task<IActionResult> RoleUzytkownikow(CancellationToken ct) =>
        this.ToActionResult(await service.PobierzSlownikAsync(TypSlownika.RoleUzytkownikow, ct));

    [HttpGet("role-zalogi")]
    [ProducesResponseType(typeof(ApiResult<List<SlownikDto>>), 200)]
    public async Task<IActionResult> RoleZalogi(CancellationToken ct) =>
        this.ToActionResult(await service.PobierzSlownikAsync(TypSlownika.RoleZalogi, ct));

    [HttpGet("rodzaje-czynnosci")]
    [ProducesResponseType(typeof(ApiResult<List<SlownikDto>>), 200)]
    public async Task<IActionResult> RodzajeCzynnosci(CancellationToken ct) =>
        this.ToActionResult(await service.PobierzSlownikAsync(TypSlownika.RodzajeCzynnosci, ct));

    [HttpGet("statusy-operacji")]
    [ProducesResponseType(typeof(ApiResult<List<SlownikDto>>), 200)]
    public async Task<IActionResult> StatusyOperacji(CancellationToken ct) =>
        this.ToActionResult(await service.PobierzSlownikAsync(TypSlownika.StatusyOperacji, ct));

    [HttpGet("statusy-zlecen")]
    [ProducesResponseType(typeof(ApiResult<List<SlownikDto>>), 200)]
    public async Task<IActionResult> StatusyZlecen(CancellationToken ct) =>
        this.ToActionResult(await service.PobierzSlownikAsync(TypSlownika.StatusyZlecen, ct));
}
