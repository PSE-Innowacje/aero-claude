using System.Security.Claims;
using LotyApi.Common;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Models;
using LotyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Controllers;

[ApiController]
[Route("api/operacje")]
[Authorize]
[Produces("application/json")]
public class OperacjeController(LotyDbContext db, INumeratorService numerator, ILogger<OperacjeController> logger)
    : ControllerBase
{
    private int BiezacyUzytkownikId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string BiezacaRola =>
        User.FindFirstValue(ClaimTypes.Role) ?? "";

    /// <summary>Pobiera stronicowaną listę planowanych operacji lotniczych.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<PagedResult<OperacjaListDto>>), 200)]
    public async Task<IActionResult> Lista([FromQuery] OperacjeQuery q, CancellationToken ct)
    {
        var query = db.PlanowaneOperacje
            .Include(o => o.Status)
            .Include(o => o.RodzajeCzynnosci).ThenInclude(r => r.RodzajCzynnosci)
            .AsNoTracking()
            .AsQueryable();

        var filtrStatus = q.StatusId ?? StatusOperacji.PotwierdzoneDoPlan;
        query = query.Where(o => o.StatusId == filtrStatus);

        if (!string.IsNullOrWhiteSpace(q.NumerZlecenia))
            query = query.Where(o => o.NumerZleceniaProjektu.Contains(q.NumerZlecenia));

        if (q.PlanowanaOd.HasValue)
            query = query.Where(o => o.PlanowanaDataOd >= q.PlanowanaOd);

        if (q.PlanowanaDo.HasValue)
            query = query.Where(o => o.PlanowanaDataDo <= q.PlanowanaDo);

        query = query.OrderBy(o => o.PlanowanaDataOd);

        var req = new PagedRequest(q.Strona, q.RozmiarStrony);
        var total = await query.CountAsync(ct);
        var items = await query
            .Skip(req.Pominij).Take(req.RozmiarStrony)
            .Select(o => new OperacjaListDto(
                o.Id, o.Numer, o.NumerZleceniaProjektu, o.OpisSkrocony,
                o.RodzajeCzynnosci.Select(r => r.RodzajCzynnosci.Nazwa).ToList(),
                o.ProponowanaDataOd, o.ProponowanaDataDo,
                o.PlanowanaDataOd, o.PlanowanaDataDo,
                o.StatusId, o.Status.Nazwa))
            .ToListAsync(ct);

        var paged = new PagedResult<OperacjaListDto>
        {
            Items = items, Strona = req.Strona,
            RozmiarStrony = req.RozmiarStrony, LacznaLiczba = total
        };
        return Ok(ApiResult<PagedResult<OperacjaListDto>>.Ok(paged));
    }

    /// <summary>Pobiera szczegóły planowanej operacji lotniczej.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<OperacjaDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct)
    {
        var o = await db.PlanowaneOperacje
            .Include(x => x.Status)
            .Include(x => x.Wprowadzajacy)
            .Include(x => x.RodzajeCzynnosci).ThenInclude(r => r.RodzajCzynnosci)
            .Include(x => x.PunktyTrasy)
            .Include(x => x.OsobyKontaktowe)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (o is null) return NotFound(ApiResult.Fail($"Operacja {id} nie istnieje."));
        return Ok(ApiResult<OperacjaDto>.Ok(MapDoDto(o)));
    }

    /// <summary>Tworzy nową planowaną operację lotniczą.</summary>
    [HttpPost]
    [Authorize(Roles = Role.PlanowanieGroup)]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Utworz([FromBody] UtworzOperacjeDto dto, CancellationToken ct)
    {
        var numer = await numerator.NastepnyNumerOperacjiAsync();

        var operacja = new PlanowanaOperacja
        {
            Numer = numer,
            NumerZleceniaProjektu = dto.NumerZleceniaProjektu,
            OpisSkrocony = dto.OpisSkrocony,
            KmlNazwaPliku = dto.KmlNazwaPliku,
            KmlZawartosc = dto.KmlZawartosc,
            LiczbaKmTrasy = dto.LiczbaKmTrasy,
            ProponowanaDataOd = dto.ProponowanaDataOd,
            ProponowanaDataDo = dto.ProponowanaDataDo,
            DodatkoweInfo = dto.DodatkoweInfo,
            StatusId = StatusOperacji.Wprowadzone,
            WprowadzajacyId = BiezacyUzytkownikId
        };

        foreach (var rcId in dto.RodzajeCzynnosciIds)
            operacja.RodzajeCzynnosci.Add(new OperacjaRodzajCzynnosci { RodzajCzynnosciId = rcId });
        foreach (var p in dto.PunktyTrasy)
            operacja.PunktyTrasy.Add(new OperacjaPunktTrasy
                { Kolejnosc = p.Kolejnosc, Szerokosc = p.Szerokosc, Dlugosc = p.Dlugosc });
        foreach (var uid in dto.OsobyKontaktoweIds)
            operacja.OsobyKontaktowe.Add(new OperacjaOsobaKontaktowa { UzytkownikId = uid });

        db.PlanowaneOperacje.Add(operacja);
        await db.SaveChangesAsync(ct);

        db.OperacjeHistoriaZmian.Add(new OperacjaHistoriaZmian
        {
            OperacjaId = operacja.Id, Pole = "status",
            StaraWartosc = null, NowaWartosc = StatusOperacji.Wprowadzone.ToString(),
            ZmienionePrzez = BiezacyUzytkownikId
        });
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Utworzono operację {Numer} przez użytkownika {UserId}", numer, BiezacyUzytkownikId);
        return CreatedAtAction(nameof(Szczegoly), new { id = operacja.Id }, ApiResult<int>.Ok(operacja.Id));
    }

    /// <summary>Aktualizuje planowaną operację lotniczą.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = Role.PlanowanieGroup)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujOperacjeDto dto, CancellationToken ct)
    {
        var o = await db.PlanowaneOperacje
            .Include(x => x.RodzajeCzynnosci)
            .Include(x => x.PunktyTrasy)
            .Include(x => x.OsobyKontaktowe)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (o is null) return NotFound(ApiResult.Fail($"Operacja {id} nie istnieje."));

        var dozwoloneStatusy = new[]
        {
            StatusOperacji.Wprowadzone, StatusOperacji.Odrzucone,
            StatusOperacji.PotwierdzoneDoPlan, StatusOperacji.ZaplanowaneDoZlecenia,
            StatusOperacji.CzesciowoZrealizowane
        };

        if (BiezacaRola == Role.OsobaPlanjujaca && !dozwoloneStatusy.Contains(o.StatusId))
            return StatusCode(403, ApiResult.Fail("Brak uprawnień do edycji operacji w tym statusie."));

        o.NumerZleceniaProjektu = dto.NumerZleceniaProjektu;
        o.OpisSkrocony = dto.OpisSkrocony;
        o.KmlNazwaPliku = dto.KmlNazwaPliku;
        o.KmlZawartosc = dto.KmlZawartosc;
        o.LiczbaKmTrasy = dto.LiczbaKmTrasy;
        o.ProponowanaDataOd = dto.ProponowanaDataOd;
        o.ProponowanaDataDo = dto.ProponowanaDataDo;
        o.DodatkoweInfo = dto.DodatkoweInfo;
        o.Komentarz = dto.Komentarz;
        o.UpdatedAt = DateTime.UtcNow;

        if (BiezacaRola == Role.OsobaNadzorujaca)
        {
            DodajHistorieJesliZmiana(o.Id, "planowana_data_od",
                o.PlanowanaDataOd?.ToString(), dto.PlanowanaDataOd?.ToString());
            DodajHistorieJesliZmiana(o.Id, "planowana_data_do",
                o.PlanowanaDataDo?.ToString(), dto.PlanowanaDataDo?.ToString());
            o.PlanowanaDataOd = dto.PlanowanaDataOd;
            o.PlanowanaDataDo = dto.PlanowanaDataDo;
            o.UwagiPoRealizacji = dto.UwagiPoRealizacji;
        }

        o.RodzajeCzynnosci.Clear();
        foreach (var rcId in dto.RodzajeCzynnosciIds)
            o.RodzajeCzynnosci.Add(new OperacjaRodzajCzynnosci { OperacjaId = id, RodzajCzynnosciId = rcId });
        o.PunktyTrasy.Clear();
        foreach (var p in dto.PunktyTrasy)
            o.PunktyTrasy.Add(new OperacjaPunktTrasy
                { OperacjaId = id, Kolejnosc = p.Kolejnosc, Szerokosc = p.Szerokosc, Dlugosc = p.Dlugosc });
        o.OsobyKontaktowe.Clear();
        foreach (var uid in dto.OsobyKontaktoweIds)
            o.OsobyKontaktowe.Add(new OperacjaOsobaKontaktowa { OperacjaId = id, UzytkownikId = uid });

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Zmienia status planowanej operacji (Odrzuć, Potwierdź, Rezygnuj).</summary>
    [HttpPost("{id:int}/status")]
    [Authorize(Roles = Role.PlanowanieGroup)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ZmienStatus(int id, [FromBody] ZmienStatusOperacjiDto dto, CancellationToken ct)
    {
        var o = await db.PlanowaneOperacje.FindAsync([id], ct);
        if (o is null) return NotFound(ApiResult.Fail($"Operacja {id} nie istnieje."));

        var stary = o.StatusId;
        var dozwolone = (BiezacaRola, stary, dto.StatusId) switch
        {
            (Role.OsobaNadzorujaca, StatusOperacji.Wprowadzone, StatusOperacji.Odrzucone)           => true,
            (Role.OsobaNadzorujaca, StatusOperacji.Wprowadzone, StatusOperacji.PotwierdzoneDoPlan)  => true,
            (Role.OsobaPlanjujaca,  StatusOperacji.Wprowadzone, StatusOperacji.Rezygnacja)          => true,
            (Role.OsobaPlanjujaca,  StatusOperacji.PotwierdzoneDoPlan, StatusOperacji.Rezygnacja)   => true,
            (Role.OsobaPlanjujaca,  StatusOperacji.ZaplanowaneDoZlecenia, StatusOperacji.Rezygnacja)=> true,
            _ => false
        };

        if (!dozwolone)
            return BadRequest(ApiResult.Fail(
                $"Niedozwolona zmiana statusu z {stary} na {dto.StatusId} dla roli '{BiezacaRola}'."));

        if (dto.StatusId == StatusOperacji.PotwierdzoneDoPlan
            && (o.PlanowanaDataOd is null || o.PlanowanaDataDo is null))
            return BadRequest(ApiResult.Fail("Wymagane planowane daty przed potwierdzeniem."));

        DodajHistorieJesliZmiana(id, "status", stary.ToString(), dto.StatusId.ToString());
        o.StatusId = dto.StatusId;
        if (dto.Komentarz is not null) o.Komentarz = dto.Komentarz;
        o.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Status operacji {Id} zmieniony {Stary}→{Nowy}", id, stary, dto.StatusId);
        return NoContent();
    }

    /// <summary>Pobiera listę komentarzy do operacji.</summary>
    [HttpGet("{id:int}/komentarze")]
    [ProducesResponseType(typeof(ApiResult<List<KomentarzDto>>), 200)]
    public async Task<IActionResult> Komentarze(int id, CancellationToken ct)
    {
        if (!await db.PlanowaneOperacje.AnyAsync(o => o.Id == id, ct))
            return NotFound(ApiResult.Fail($"Operacja {id} nie istnieje."));

        var lista = await db.OperacjeKomentarze
            .Include(k => k.Autor)
            .Where(k => k.OperacjaId == id)
            .OrderBy(k => k.CreatedAt)
            .AsNoTracking()
            .Select(k => new KomentarzDto(k.Id, k.Tresc, k.Autor.Email, k.CreatedAt))
            .ToListAsync(ct);

        return Ok(ApiResult<List<KomentarzDto>>.Ok(lista));
    }

    /// <summary>Dodaje komentarz do operacji.</summary>
    [HttpPost("{id:int}/komentarze")]
    [ProducesResponseType(201)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DodajKomentarz(int id, [FromBody] DodajKomentarzDto dto, CancellationToken ct)
    {
        if (!await db.PlanowaneOperacje.AnyAsync(o => o.Id == id, ct))
            return NotFound(ApiResult.Fail($"Operacja {id} nie istnieje."));

        var komentarz = new OperacjaKomentarz
            { OperacjaId = id, Tresc = dto.Tresc, AutorId = BiezacyUzytkownikId };
        db.OperacjeKomentarze.Add(komentarz);
        await db.SaveChangesAsync(ct);
        return StatusCode(201, ApiResult<int>.Ok(komentarz.Id));
    }

    /// <summary>Pobiera historię zmian statusów i dat operacji.</summary>
    [HttpGet("{id:int}/historia")]
    [ProducesResponseType(typeof(ApiResult<List<HistoriaZmianyDto>>), 200)]
    public async Task<IActionResult> Historia(int id, CancellationToken ct)
    {
        var lista = await db.OperacjeHistoriaZmian
            .Include(h => h.ZmienionePrzezNav)
            .Where(h => h.OperacjaId == id)
            .OrderBy(h => h.DataZmiany)
            .AsNoTracking()
            .Select(h => new HistoriaZmianyDto(
                h.Id, h.Pole, h.StaraWartosc, h.NowaWartosc,
                h.ZmienionePrzezNav.Email, h.DataZmiany))
            .ToListAsync(ct);

        return Ok(ApiResult<List<HistoriaZmianyDto>>.Ok(lista));
    }

    // ── helpers ───────────────────────────────────────────────

    private static OperacjaDto MapDoDto(PlanowanaOperacja o) => new(
        o.Id, o.Numer, o.NumerZleceniaProjektu, o.OpisSkrocony,
        o.KmlNazwaPliku, o.LiczbaKmTrasy,
        o.ProponowanaDataOd, o.ProponowanaDataDo,
        o.PlanowanaDataOd, o.PlanowanaDataDo,
        o.DodatkoweInfo, o.Komentarz, o.UwagiPoRealizacji,
        o.StatusId, o.Status.Nazwa,
        o.WprowadzajacyId, o.Wprowadzajacy.Email,
        o.RodzajeCzynnosci.Select(r => r.RodzajCzynnosciId).ToList(),
        o.RodzajeCzynnosci.Select(r => r.RodzajCzynnosci.Nazwa).ToList(),
        o.PunktyTrasy.OrderBy(p => p.Kolejnosc)
                     .Select(p => new PunktTrasyDto(p.Kolejnosc, p.Szerokosc, p.Dlugosc)).ToList(),
        o.OsobyKontaktowe.Select(x => x.UzytkownikId).ToList(),
        o.CreatedAt, o.UpdatedAt);

    private void DodajHistorieJesliZmiana(int operacjaId, string pole, string? stara, string? nowa)
    {
        if (stara == nowa) return;
        db.OperacjeHistoriaZmian.Add(new OperacjaHistoriaZmian
        {
            OperacjaId = operacjaId, Pole = pole,
            StaraWartosc = stara, NowaWartosc = nowa,
            ZmienionePrzez = BiezacyUzytkownikId
        });
    }
}
