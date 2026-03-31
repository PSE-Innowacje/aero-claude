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
[Route("api/zlecenia")]
[Authorize]
[Produces("application/json")]
public class ZleceniaController(LotyDbContext db, INumeratorService numerator, ILogger<ZleceniaController> logger)
    : ControllerBase
{
    private int BiezacyUzytkownikId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string BiezacaRola =>
        User.FindFirstValue(ClaimTypes.Role) ?? "";

    /// <summary>Pobiera stronicowaną listę zleceń na lot.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<PagedResult<ZlecenieListDto>>), 200)]
    public async Task<IActionResult> Lista([FromQuery] ZleceniaQuery q, CancellationToken ct)
    {
        var query = db.ZleceniaNaLot
            .Include(z => z.Status)
            .Include(z => z.Pilot)
            .Include(z => z.Helikopter)
            .AsNoTracking()
            .AsQueryable();

        if (q.StatusId.HasValue)
            query = query.Where(z => z.StatusId == q.StatusId.Value);

        if (q.PilotId.HasValue)    query = query.Where(z => z.PilotId == q.PilotId);
        if (q.HelikopterId.HasValue) query = query.Where(z => z.HelikopterId == q.HelikopterId);
        if (q.StartOd.HasValue)    query = query.Where(z => z.PlanowanyStartDt >= q.StartOd);
        if (q.StartDo.HasValue)    query = query.Where(z => z.PlanowanyStartDt <= q.StartDo);

        query = query.OrderBy(z => z.PlanowanyStartDt);

        var req = new PagedRequest(q.Strona, q.RozmiarStrony);
        var total = await query.CountAsync(ct);
        var items = await query
            .Skip(req.Pominij).Take(req.RozmiarStrony)
            .Select(z => new ZlecenieListDto(
                z.Id, z.Numer, z.PlanowanyStartDt,
                z.Helikopter.NumerRejestracyjny,
                z.Pilot.Imie + " " + z.Pilot.Nazwisko,
                z.StatusId, z.Status.Nazwa))
            .ToListAsync(ct);

        var paged = new PagedResult<ZlecenieListDto>
        {
            Items = items, Strona = req.Strona,
            RozmiarStrony = req.RozmiarStrony, LacznaLiczba = total
        };
        return Ok(ApiResult<PagedResult<ZlecenieListDto>>.Ok(paged));
    }

    /// <summary>Pobiera szczegóły zlecenia na lot.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<ZlecenieDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct)
    {
        var z = await db.ZleceniaNaLot
            .Include(x => x.Status)
            .Include(x => x.Pilot)
            .Include(x => x.Helikopter)
            .Include(x => x.LadowiskoStartowe)
            .Include(x => x.LadowiskoKoncowe)
            .Include(x => x.Tworzacy)
            .Include(x => x.CzlonkowieZalogi).ThenInclude(c => c.Czlonek)
            .Include(x => x.ZlecenieOperacje).ThenInclude(zo => zo.Operacja).ThenInclude(o => o.Status)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (z is null) return NotFound(ApiResult.Fail($"Zlecenie {id} nie istnieje."));
        return Ok(ApiResult<ZlecenieDto>.Ok(MapDoDto(z)));
    }

    /// <summary>Tworzy nowe zlecenie na lot. Pilot uzupełniany automatycznie z zalogowanego użytkownika.</summary>
    [HttpPost]
    [Authorize(Roles = Role.PilotGroup)]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Utworz([FromBody] UtworzZlecenieDto dto, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            var pilot = await db.CzlonkowieZalogi
                .Include(c => c.Rola)
                .FirstOrDefaultAsync(c =>
                    c.Email == User.FindFirstValue(ClaimTypes.Email) && c.Aktywny, ct);

            if (pilot is null)
                return BadRequest(ApiResult.Fail("Bieżący użytkownik nie jest aktywnym członkiem załogi."));

            var helikopter = await db.Helikoptery.FindAsync([dto.HelikopterId], ct);
            if (helikopter is null) return BadRequest(ApiResult.Fail("Nie znaleziono helikoptera."));

            var czlonkowie = await db.CzlonkowieZalogi
                .Where(c => dto.CzlonkowieZalogiIds.Contains(c.Id)).ToListAsync(ct);

            var bledy = WalidujZlecenie(dto, pilot, helikopter, czlonkowie);
            if (bledy.Count > 0) return BadRequest(ApiResult.Fail(bledy));

            var wagaZalogi = pilot.WagaKg + czlonkowie.Sum(c => c.WagaKg);
            var numer = await numerator.NastepnyNumerZleceniaAsync();

            var zlecenie = new ZlecenieNaLot
            {
                Numer = numer,
                PlanowanyStartDt = dto.PlanowanyStartDt,
                PlanowaneLadowanieDt = dto.PlanowaneLadowanieDt,
                PilotId = pilot.Id,
                HelikopterId = dto.HelikopterId,
                LadowiskoStartoweId = dto.LadowiskoStartoweId,
                LadowiskoKoncoweId = dto.LadowiskoKoncoweId,
                SzacowanaDlugoscTrasy = dto.SzacowanaDlugoscTrasy,
                WagaZalogiKg = wagaZalogi,
                StatusId = StatusZlecenia.Wprowadzone,
                TworzacyId = BiezacyUzytkownikId
            };

            foreach (var cId in dto.CzlonkowieZalogiIds)
                zlecenie.CzlonkowieZalogi.Add(new ZlecienieCzlonekZalogi { CzlonekId = cId });
            foreach (var oId in dto.OperacjeIds)
                zlecenie.ZlecenieOperacje.Add(new ZlecenieOperacja { OperacjaId = oId });

            db.ZleceniaNaLot.Add(zlecenie);

            // Automatycznie: operacje 3→4
            var operacje = await db.PlanowaneOperacje
                .Where(o => dto.OperacjeIds.Contains(o.Id)).ToListAsync(ct);

            foreach (var op in operacje.Where(o => o.StatusId == StatusOperacji.PotwierdzoneDoPlan))
            {
                DodajHistorieOperacji(op.Id, "status",
                    StatusOperacji.PotwierdzoneDoPlan.ToString(),
                    StatusOperacji.ZaplanowaneDoZlecenia.ToString());
                op.StatusId = StatusOperacji.ZaplanowaneDoZlecenia;
            }

            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            logger.LogInformation("Utworzono zlecenie {Numer} przez pilota {UserId}", numer, BiezacyUzytkownikId);
            return CreatedAtAction(nameof(Szczegoly), new { id = zlecenie.Id }, ApiResult<int>.Ok(zlecenie.Id));
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }

    /// <summary>Aktualizuje zlecenie na lot.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = Role.ZleceniaGroup)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujZlecenieDto dto, CancellationToken ct)
    {
        var z = await db.ZleceniaNaLot
            .Include(x => x.CzlonkowieZalogi)
            .Include(x => x.ZlecenieOperacje)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (z is null) return NotFound(ApiResult.Fail($"Zlecenie {id} nie istnieje."));

        var helikopter = await db.Helikoptery.FindAsync([dto.HelikopterId], ct);
        var pilot = await db.CzlonkowieZalogi.FindAsync([z.PilotId], ct);
        if (helikopter is null || pilot is null)
            return BadRequest(ApiResult.Fail("Helikopter lub pilot nie istnieje."));

        var czlonkowie = await db.CzlonkowieZalogi
            .Where(c => dto.CzlonkowieZalogiIds.Contains(c.Id)).ToListAsync(ct);

        z.PlanowanyStartDt = dto.PlanowanyStartDt;
        z.PlanowaneLadowanieDt = dto.PlanowaneLadowanieDt;
        z.RzeczywistyStartDt = dto.RzeczywistyStartDt;
        z.RzeczywisteLadowanieDt = dto.RzeczywisteLadowanieDt;
        z.HelikopterId = dto.HelikopterId;
        z.LadowiskoStartoweId = dto.LadowiskoStartoweId;
        z.LadowiskoKoncoweId = dto.LadowiskoKoncoweId;
        z.SzacowanaDlugoscTrasy = dto.SzacowanaDlugoscTrasy;
        z.WagaZalogiKg = pilot.WagaKg + czlonkowie.Sum(c => c.WagaKg);
        z.UpdatedAt = DateTime.UtcNow;

        z.CzlonkowieZalogi.Clear();
        foreach (var cId in dto.CzlonkowieZalogiIds)
            z.CzlonkowieZalogi.Add(new ZlecienieCzlonekZalogi { ZlecenieId = id, CzlonekId = cId });
        z.ZlecenieOperacje.Clear();
        foreach (var oId in dto.OperacjeIds)
            z.ZlecenieOperacje.Add(new ZlecenieOperacja { ZlecenieId = id, OperacjaId = oId });

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Zmienia status zlecenia. Kaskadowo aktualizuje statusy powiązanych operacji.</summary>
    [HttpPost("{id:int}/status")]
    [Authorize(Roles = Role.ZleceniaGroup)]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ZmienStatus(int id, [FromBody] ZmienStatusZlecenieDto dto, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            var z = await db.ZleceniaNaLot
                .Include(x => x.ZlecenieOperacje)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (z is null) return NotFound(ApiResult.Fail($"Zlecenie {id} nie istnieje."));

            var stary = z.StatusId;
            var dozwolone = (BiezacaRola, stary, dto.StatusId) switch
            {
                (Role.Administrator,    _, _)                                                                       => true,
                (Role.Pilot,            StatusZlecenia.Wprowadzone,          StatusZlecenia.PrzekazaneDoAkceptacji) => true,
                (Role.OsobaNadzorujaca, StatusZlecenia.PrzekazaneDoAkceptacji, StatusZlecenia.Odrzucone)            => true,
                (Role.OsobaNadzorujaca, StatusZlecenia.PrzekazaneDoAkceptacji, StatusZlecenia.Zaakceptowane)        => true,
                (Role.Pilot,            StatusZlecenia.Zaakceptowane,         StatusZlecenia.ZrealizowaneWCzesci)   => true,
                (Role.Pilot,            StatusZlecenia.Zaakceptowane,         StatusZlecenia.ZrealizowaneWCalosci)  => true,
                (Role.Pilot,            StatusZlecenia.Zaakceptowane,         StatusZlecenia.NieZrealizowane)       => true,
                _ => false
            };

            if (!dozwolone)
                return BadRequest(ApiResult.Fail(
                    $"Niedozwolona zmiana statusu z {stary} na {dto.StatusId} dla roli '{BiezacaRola}'."));

            if (dto.StatusId is StatusZlecenia.ZrealizowaneWCzesci or StatusZlecenia.ZrealizowaneWCalosci
                && (z.RzeczywistyStartDt is null || z.RzeczywisteLadowanieDt is null))
                return BadRequest(ApiResult.Fail("Wymagane rzeczywiste czasy startu i lądowania."));

            DodajHistorieZlecenia(id, "status", stary.ToString(), dto.StatusId.ToString());
            z.StatusId = dto.StatusId;
            z.UpdatedAt = DateTime.UtcNow;

            // Kaskadowe zmiany statusów operacji
            var operacjeIds = z.ZlecenieOperacje.Select(zo => zo.OperacjaId).ToList();
            var operacje = await db.PlanowaneOperacje
                .Where(o => operacjeIds.Contains(o.Id)).ToListAsync(ct);

            foreach (var op in operacje)
            {
                var (staryOp, nowyOp) = dto.StatusId switch
                {
                    StatusZlecenia.ZrealizowaneWCzesci  => (StatusOperacji.ZaplanowaneDoZlecenia, StatusOperacji.CzesciowoZrealizowane),
                    StatusZlecenia.ZrealizowaneWCalosci => (StatusOperacji.ZaplanowaneDoZlecenia, StatusOperacji.Zrealizowane),
                    StatusZlecenia.NieZrealizowane      => (StatusOperacji.ZaplanowaneDoZlecenia, StatusOperacji.PotwierdzoneDoPlan),
                    _ => (0, 0)
                };
                if (nowyOp != 0 && op.StatusId == staryOp)
                {
                    DodajHistorieOperacji(op.Id, "status", staryOp.ToString(), nowyOp.ToString());
                    op.StatusId = nowyOp;
                }
            }

            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            logger.LogInformation("Status zlecenia {Id} zmieniony {Stary}→{Nowy}", id, stary, dto.StatusId);
            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }

    /// <summary>Pobiera historię zmian statusów zlecenia.</summary>
    [HttpGet("{id:int}/historia")]
    [ProducesResponseType(typeof(ApiResult<List<HistoriaZmianyDto>>), 200)]
    public async Task<IActionResult> Historia(int id, CancellationToken ct)
    {
        var lista = await db.ZlecenieHistoriaZmian
            .Include(h => h.ZmienionePrzezNav)
            .Where(h => h.ZlecenieId == id)
            .OrderBy(h => h.DataZmiany)
            .AsNoTracking()
            .Select(h => new HistoriaZmianyDto(
                h.Id, h.Pole, h.StaraWartosc, h.NowaWartosc,
                h.ZmienionePrzezNav.Email, h.DataZmiany))
            .ToListAsync(ct);

        return Ok(ApiResult<List<HistoriaZmianyDto>>.Ok(lista));
    }

    // ── Walidacje biznesowe ───────────────────────────────────

    private static List<string> WalidujZlecenie(
        UtworzZlecenieDto dto, CzlonekZalogi pilot,
        Helikopter helikopter, List<CzlonekZalogi> czlonkowie)
    {
        var bledy = new List<string>();
        var dataLotu = DateOnly.FromDateTime(dto.PlanowanyStartDt);

        if (helikopter.DataWaznosciPrzegladu < dataLotu)
            bledy.Add($"Helikopter {helikopter.NumerRejestracyjny}: nieważny przegląd ({helikopter.DataWaznosciPrzegladu:d}).");

        if (pilot.DataWaznosciLicencji < dataLotu)
            bledy.Add($"Pilot {pilot.Imie} {pilot.Nazwisko}: nieważna licencja ({pilot.DataWaznosciLicencji:d}).");

        if (pilot.DataWaznosciSzkolenia < dataLotu)
            bledy.Add($"Pilot {pilot.Imie} {pilot.Nazwisko}: nieważne szkolenie ({pilot.DataWaznosciSzkolenia:d}).");

        foreach (var c in czlonkowie.Where(c => c.DataWaznosciSzkolenia < dataLotu))
            bledy.Add($"Członek załogi {c.Imie} {c.Nazwisko}: nieważne szkolenie ({c.DataWaznosciSzkolenia:d}).");

        var wagaZalogi = pilot.WagaKg + czlonkowie.Sum(c => c.WagaKg);
        if (wagaZalogi > helikopter.MaksUdzwigKg)
            bledy.Add($"Waga załogi ({wagaZalogi} kg) przekracza udźwig helikoptera ({helikopter.MaksUdzwigKg} kg).");

        if (dto.SzacowanaDlugoscTrasy > helikopter.ZasiegKm)
            bledy.Add($"Trasa ({dto.SzacowanaDlugoscTrasy} km) przekracza zasięg helikoptera ({helikopter.ZasiegKm} km).");

        return bledy;
    }

    // ── Helpers ───────────────────────────────────────────────

    private static ZlecenieDto MapDoDto(ZlecenieNaLot z) => new(
        z.Id, z.Numer,
        z.PlanowanyStartDt, z.PlanowaneLadowanieDt,
        z.RzeczywistyStartDt, z.RzeczywisteLadowanieDt,
        z.PilotId, z.Pilot.Imie + " " + z.Pilot.Nazwisko,
        z.HelikopterId, z.Helikopter.NumerRejestracyjny,
        z.LadowiskoStartoweId, z.LadowiskoStartowe.Nazwa,
        z.LadowiskoKoncoweId, z.LadowiskoKoncowe.Nazwa,
        z.SzacowanaDlugoscTrasy, z.WagaZalogiKg,
        z.StatusId, z.Status.Nazwa,
        z.CzlonkowieZalogi.Select(c => c.CzlonekId).ToList(),
        z.CzlonkowieZalogi.Select(c => c.Czlonek.Imie + " " + c.Czlonek.Nazwisko).ToList(),
        z.ZlecenieOperacje.Select(o => new OperacjaSkrotDto(o.OperacjaId, o.Operacja.Numer, o.Operacja.OpisSkrocony, o.Operacja.StatusId, o.Operacja.Status.Nazwa)).ToList(),
        z.CreatedAt, z.UpdatedAt);

    private void DodajHistorieZlecenia(int zlecenieId, string pole, string? stara, string? nowa)
    {
        db.ZlecenieHistoriaZmian.Add(new ZlecenieHistoriaZmian
        {
            ZlecenieId = zlecenieId, Pole = pole,
            StaraWartosc = stara, NowaWartosc = nowa,
            ZmienionePrzez = BiezacyUzytkownikId
        });
    }

    private void DodajHistorieOperacji(int operacjaId, string pole, string? stara, string? nowa)
    {
        db.OperacjeHistoriaZmian.Add(new OperacjaHistoriaZmian
        {
            OperacjaId = operacjaId, Pole = pole,
            StaraWartosc = stara, NowaWartosc = nowa,
            ZmienionePrzez = BiezacyUzytkownikId
        });
    }
}
