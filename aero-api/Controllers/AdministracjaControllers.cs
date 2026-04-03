using LotyApi.Common;
using LotyApi.DTOs;
using LotyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LotyApi.Controllers;

// ── Użytkownicy ──────────────────────────────────────────────

[ApiController]
[Route("api/uzytkownicy")]
[Authorize(Roles = Role.Administrator)]
[Produces("application/json")]
public class UzytkownicyController(IUzytkownikService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<List<UzytkownikDto>>), 200)]
    public async Task<IActionResult> Lista(CancellationToken ct) =>
        this.ToActionResult(await service.PobierzWszystkichAsync(ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<UzytkownikDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct) =>
        this.ToActionResult(await service.PobierzAsync(id, ct));

    [HttpPost]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> Utworz([FromBody] UtworzUzytkownikaDto dto, CancellationToken ct) =>
        this.ToCreatedResult(await service.UtworzAsync(dto, ct), nameof(Szczegoly));

    [HttpPut("{id:int}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujUzytkownikaDto dto, CancellationToken ct) =>
        this.ToActionResult(await service.AktualizujAsync(id, dto, ct));

    /// <summary>Lista aktywnych użytkowników do wyboru jako osoby kontaktowe – dostępna dla wszystkich zalogowanych.</summary>
    [HttpGet("kontakty")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResult<List<UzytkownikDto>>), 200)]
    public async Task<IActionResult> Kontakty(CancellationToken ct) =>
        this.ToActionResult(await service.PobierzKontaktyAsync(ct));
}

// ── Helikoptery ──────────────────────────────────────────────

[ApiController]
[Route("api/helikoptery")]
[Authorize]
[Produces("application/json")]
public class HelikopteryController(IHelikopterService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<List<HelikopterDto>>), 200)]
    public async Task<IActionResult> Lista(CancellationToken ct) =>
        this.ToActionResult(await service.PobierzWszystkieAsync(ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<HelikopterDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct) =>
        this.ToActionResult(await service.PobierzAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    public async Task<IActionResult> Utworz([FromBody] UtworzHelikopterDto dto, CancellationToken ct) =>
        this.ToCreatedResult(await service.UtworzAsync(dto, ct), nameof(Szczegoly));

    [HttpPut("{id:int}")]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujHelikopterDto dto, CancellationToken ct) =>
        this.ToActionResult(await service.AktualizujAsync(id, dto, ct));
}

// ── Członkowie załogi ────────────────────────────────────────

[ApiController]
[Route("api/czlonkowie-zalogi")]
[Authorize]
[Produces("application/json")]
public class CzlonkowieZalogiController(ICzlonekZalogiService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<List<CzlonekZalogiDto>>), 200)]
    public async Task<IActionResult> Lista(CancellationToken ct) =>
        this.ToActionResult(await service.PobierzWszystkichAsync(ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<CzlonekZalogiDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct) =>
        this.ToActionResult(await service.PobierzAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    public async Task<IActionResult> Utworz([FromBody] UtworzCzlonkaZalogiDto dto, CancellationToken ct) =>
        this.ToCreatedResult(await service.UtworzAsync(dto, ct), nameof(Szczegoly));

    [HttpPut("{id:int}")]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujCzlonkaZalogiDto dto, CancellationToken ct) =>
        this.ToActionResult(await service.AktualizujAsync(id, dto, ct));
}

// ── Lądowiska ────────────────────────────────────────────────

[ApiController]
[Route("api/ladowiska")]
[Authorize]
[Produces("application/json")]
public class LadowiskaController(ILadowiskoService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<List<LadowiskoDto>>), 200)]
    public async Task<IActionResult> Lista(CancellationToken ct) =>
        this.ToActionResult(await service.PobierzWszystkieAsync(ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<LadowiskoDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct) =>
        this.ToActionResult(await service.PobierzAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    public async Task<IActionResult> Utworz([FromBody] UtworzLadowiskoDto dto, CancellationToken ct) =>
        this.ToCreatedResult(await service.UtworzAsync(dto, ct), nameof(Szczegoly));

    [HttpPut("{id:int}")]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujLadowiskoDto dto, CancellationToken ct) =>
        this.ToActionResult(await service.AktualizujAsync(id, dto, ct));
}
