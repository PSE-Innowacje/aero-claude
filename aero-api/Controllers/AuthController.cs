using LotyApi.Common;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController(IAuthService authService) : ControllerBase
{
    /// <summary>Logowanie — zwraca token JWT ważny 8 godzin.</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResult<LoginResponseDto>), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await authService.LoginAsync(dto);
        if (result is null)
            return Unauthorized(ApiResult.Fail("Nieprawidłowy email lub hasło."));
        return Ok(ApiResult<LoginResponseDto>.Ok(result));
    }
}

// ── Słowniki ─────────────────────────────────────────────────

[ApiController]
[Route("api/slowniki")]
[Authorize]
[Produces("application/json")]
public class SlownikiController(LotyDbContext db) : ControllerBase
{
    [HttpGet("role-uzytkownikow")]
    [ProducesResponseType(typeof(ApiResult<List<SlownikDto>>), 200)]
    public async Task<IActionResult> RoleUzytkownikow(CancellationToken ct) =>
        Ok(ApiResult<List<SlownikDto>>.Ok(
            await db.SlownikRolUzytkownikow.AsNoTracking()
                .Select(x => new SlownikDto(x.Id, x.Nazwa)).ToListAsync(ct)));

    [HttpGet("role-zalogi")]
    [ProducesResponseType(typeof(ApiResult<List<SlownikDto>>), 200)]
    public async Task<IActionResult> RoleZalogi(CancellationToken ct) =>
        Ok(ApiResult<List<SlownikDto>>.Ok(
            await db.SlownikRolZalogi.AsNoTracking()
                .Select(x => new SlownikDto(x.Id, x.Nazwa)).ToListAsync(ct)));

    [HttpGet("rodzaje-czynnosci")]
    [ProducesResponseType(typeof(ApiResult<List<SlownikDto>>), 200)]
    public async Task<IActionResult> RodzajeCzynnosci(CancellationToken ct) =>
        Ok(ApiResult<List<SlownikDto>>.Ok(
            await db.SlownikRodzajowCzynnosci.AsNoTracking()
                .Select(x => new SlownikDto(x.Id, x.Nazwa)).ToListAsync(ct)));

    [HttpGet("statusy-operacji")]
    [ProducesResponseType(typeof(ApiResult<List<SlownikDto>>), 200)]
    public async Task<IActionResult> StatusyOperacji(CancellationToken ct) =>
        Ok(ApiResult<List<SlownikDto>>.Ok(
            await db.SlownikStatusowOperacji.AsNoTracking()
                .Select(x => new SlownikDto(x.Id, x.Nazwa)).ToListAsync(ct)));

    [HttpGet("statusy-zlecen")]
    [ProducesResponseType(typeof(ApiResult<List<SlownikDto>>), 200)]
    public async Task<IActionResult> StatusyZlecen(CancellationToken ct) =>
        Ok(ApiResult<List<SlownikDto>>.Ok(
            await db.SlownikStatusowZlecen.AsNoTracking()
                .Select(x => new SlownikDto(x.Id, x.Nazwa)).ToListAsync(ct)));
}
