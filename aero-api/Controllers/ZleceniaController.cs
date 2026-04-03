using LotyApi.Common;
using LotyApi.DTOs;
using LotyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LotyApi.Controllers;

[ApiController]
[Route("api/zlecenia")]
[Authorize]
[Produces("application/json")]
public class ZleceniaController(IZlecenieService service) : ControllerBase
{
    /// <summary>Pobiera stronicowaną listę zleceń na lot.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<PagedResult<ZlecenieListDto>>), 200)]
    public async Task<IActionResult> Lista([FromQuery] ZleceniaQuery q, CancellationToken ct) =>
        this.ToActionResult(await service.PobierzListeAsync(q, ct));

    /// <summary>Pobiera szczegóły zlecenia na lot.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<ZlecenieDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct) =>
        this.ToActionResult(await service.PobierzSzczegolyAsync(id, ct));

    /// <summary>Tworzy nowe zlecenie na lot.</summary>
    [HttpPost]
    [Authorize(Roles = Role.PilotGroup)]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Utworz([FromBody] UtworzZlecenieDto dto, CancellationToken ct) =>
        this.ToCreatedResult(
            await service.UtworzAsync(dto, this.GetCurrentUser(), ct),
            nameof(Szczegoly));

    /// <summary>Aktualizuje zlecenie na lot.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = Role.ZleceniaGroup)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujZlecenieDto dto, CancellationToken ct) =>
        this.ToActionResult(await service.AktualizujAsync(id, dto, this.GetCurrentUser(), ct));

    /// <summary>Zmienia status zlecenia. Kaskadowo aktualizuje statusy powiązanych operacji.</summary>
    [HttpPost("{id:int}/status")]
    [Authorize(Roles = Role.ZleceniaGroup)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ZmienStatus(int id, [FromBody] ZmienStatusZlecenieDto dto, CancellationToken ct) =>
        this.ToActionResult(await service.ZmienStatusAsync(id, dto, this.GetCurrentUser(), ct));

    /// <summary>Pobiera historię zmian statusów zlecenia.</summary>
    [HttpGet("{id:int}/historia")]
    [ProducesResponseType(typeof(ApiResult<List<HistoriaZmianyDto>>), 200)]
    public async Task<IActionResult> Historia(int id, CancellationToken ct) =>
        this.ToActionResult(await service.PobierzHistorieAsync(id, ct));
}
