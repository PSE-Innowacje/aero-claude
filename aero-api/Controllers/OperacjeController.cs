using LotyApi.Common;
using LotyApi.DTOs;
using LotyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LotyApi.Controllers;

[ApiController]
[Route("api/operacje")]
[Authorize]
[Produces("application/json")]
public class OperacjeController(IOperacjaService service) : ControllerBase
{
    /// <summary>Pobiera stronicowaną listę planowanych operacji lotniczych.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<PagedResult<OperacjaListDto>>), 200)]
    public async Task<IActionResult> Lista([FromQuery] OperacjeQuery q, CancellationToken ct) =>
        this.ToActionResult(await service.PobierzListeAsync(q, ct));

    /// <summary>Pobiera szczegóły planowanej operacji lotniczej.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<OperacjaDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct) =>
        this.ToActionResult(await service.PobierzSzczegolyAsync(id, ct));

    /// <summary>Tworzy nową planowaną operację lotniczą.</summary>
    [HttpPost]
    [Authorize(Roles = Role.PlanowanieGroup)]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Utworz([FromBody] UtworzOperacjeDto dto, CancellationToken ct) =>
        this.ToCreatedResult(
            await service.UtworzAsync(dto, this.GetCurrentUser(), ct),
            nameof(Szczegoly));

    /// <summary>Aktualizuje planowaną operację lotniczą.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = Role.PlanowanieGroup)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujOperacjeDto dto, CancellationToken ct) =>
        this.ToActionResult(await service.AktualizujAsync(id, dto, this.GetCurrentUser(), ct));

    /// <summary>Zmienia status planowanej operacji (Odrzuć, Potwierdź, Rezygnuj).</summary>
    [HttpPost("{id:int}/status")]
    [Authorize(Roles = Role.PlanowanieGroup)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ZmienStatus(int id, [FromBody] ZmienStatusOperacjiDto dto, CancellationToken ct) =>
        this.ToActionResult(await service.ZmienStatusAsync(id, dto, this.GetCurrentUser(), ct));

    /// <summary>Pobiera listę komentarzy do operacji.</summary>
    [HttpGet("{id:int}/komentarze")]
    [ProducesResponseType(typeof(ApiResult<List<KomentarzDto>>), 200)]
    public async Task<IActionResult> Komentarze(int id, CancellationToken ct) =>
        this.ToActionResult(await service.PobierzKomentarzeAsync(id, ct));

    /// <summary>Dodaje komentarz do operacji.</summary>
    [HttpPost("{id:int}/komentarze")]
    [ProducesResponseType(201)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DodajKomentarz(int id, [FromBody] DodajKomentarzDto dto, CancellationToken ct)
    {
        var result = await service.DodajKomentarzAsync(id, dto, this.GetCurrentUser(), ct);
        return result.Success
            ? StatusCode(201, ApiResult<int>.Ok(result.Data))
            : this.ToActionResult(result);
    }

    /// <summary>Pobiera historię zmian statusów i dat operacji.</summary>
    [HttpGet("{id:int}/historia")]
    [ProducesResponseType(typeof(ApiResult<List<HistoriaZmianyDto>>), 200)]
    public async Task<IActionResult> Historia(int id, CancellationToken ct) =>
        this.ToActionResult(await service.PobierzHistorieAsync(id, ct));

    /// <summary>Lista aktywnych użytkowników do wyboru jako osoby kontaktowe.</summary>
    [HttpGet("osoby-kontaktowe")]
    [ProducesResponseType(typeof(ApiResult<List<UzytkownikDto>>), 200)]
    public async Task<IActionResult> OsobyKontaktowe(CancellationToken ct) =>
        this.ToActionResult(await service.PobierzOsobyKontaktoweAsync(ct));
}
