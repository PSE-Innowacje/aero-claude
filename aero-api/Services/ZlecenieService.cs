using LotyApi.Common;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Services;

public interface IZlecenieService
{
    Task<ServiceResult<PagedResult<ZlecenieListDto>>> PobierzListeAsync(
        ZleceniaQuery query, CancellationToken ct);

    Task<ServiceResult<ZlecenieDto>> PobierzSzczegolyAsync(int id, CancellationToken ct);

    Task<ServiceResult<int>> UtworzAsync(
        UtworzZlecenieDto dto, CurrentUser user, CancellationToken ct);

    Task<ServiceResult> AktualizujAsync(
        int id, AktualizujZlecenieDto dto, CurrentUser user, CancellationToken ct);

    Task<ServiceResult> ZmienStatusAsync(
        int id, ZmienStatusZlecenieDto dto, CurrentUser user, CancellationToken ct);

    Task<ServiceResult<List<HistoriaZmianyDto>>> PobierzHistorieAsync(int id, CancellationToken ct);
}

public class ZlecenieService(
    LotyDbContext db,
    INumeratorService numerator,
    ILogger<ZlecenieService> logger) : IZlecenieService
{
    // ── Lista ─────────────────────────────────────────────────

    public async Task<ServiceResult<PagedResult<ZlecenieListDto>>> PobierzListeAsync(
        ZleceniaQuery q, CancellationToken ct)
    {
        var query = db.ZleceniaNaLot
            .Include(z => z.Status)
            .Include(z => z.Pilot)
            .Include(z => z.Helikopter)
            .AsNoTracking()
            .AsQueryable();

        if (q.StatusId.HasValue)     query = query.Where(z => z.StatusId == q.StatusId.Value);
        if (q.PilotId.HasValue)      query = query.Where(z => z.PilotId == q.PilotId);
        if (q.HelikopterId.HasValue) query = query.Where(z => z.HelikopterId == q.HelikopterId);
        if (q.StartOd.HasValue)      query = query.Where(z => z.PlanowanyStartDt >= q.StartOd);
        if (q.StartDo.HasValue)      query = query.Where(z => z.PlanowanyStartDt <= q.StartDo);

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

        return ServiceResult<PagedResult<ZlecenieListDto>>.Ok(new PagedResult<ZlecenieListDto>
        {
            Items = items, Strona = req.Strona,
            RozmiarStrony = req.RozmiarStrony, LacznaLiczba = total
        });
    }

    // ── Szczegóły ─────────────────────────────────────────────

    public async Task<ServiceResult<ZlecenieDto>> PobierzSzczegolyAsync(int id, CancellationToken ct)
    {
        var z = await PobierzPelneZlecenieAsync(id, ct);
        if (z is null)
            return ServiceResult<ZlecenieDto>.Fail(
                ServiceErrorKind.NotFound, $"Zlecenie {id} nie istnieje.");

        return ServiceResult<ZlecenieDto>.Ok(MapDoDto(z));
    }

    // ── Tworzenie ─────────────────────────────────────────────

    public async Task<ServiceResult<int>> UtworzAsync(
        UtworzZlecenieDto dto, CurrentUser user, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        // Pilot — na podstawie emaila zalogowanego użytkownika
        var pilot = await db.CzlonkowieZalogi
            .Include(c => c.Rola)
            .FirstOrDefaultAsync(c => c.Email == user.Email && c.Aktywny, ct);

        if (pilot is null)
            return ServiceResult<int>.Fail(ServiceErrorKind.Validation,
                "Bieżący użytkownik nie jest aktywnym członkiem załogi.");

        var helikopter = await db.Helikoptery.FindAsync([dto.HelikopterId], ct);
        if (helikopter is null)
            return ServiceResult<int>.Fail(ServiceErrorKind.Validation,
                "Nie znaleziono helikoptera.");

        var czlonkowie = await db.CzlonkowieZalogi
            .Where(c => dto.CzlonkowieZalogiIds.Contains(c.Id)).ToListAsync(ct);

        var bledy = WalidujZlecenie(dto, pilot, helikopter, czlonkowie);
        if (bledy.Count > 0)
            return ServiceResult<int>.Fail(ServiceErrorKind.Validation, bledy);

        var wagaZalogi = pilot.WagaKg + czlonkowie.Sum(c => c.WagaKg);
        var numer = await numerator.NastepnyNumerZleceniaAsync(ct);

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
            TworzacyId = user.Id
        };

        foreach (var cId in dto.CzlonkowieZalogiIds)
            zlecenie.CzlonkowieZalogi.Add(new ZlecienieCzlonekZalogi { CzlonekId = cId });
        foreach (var oId in dto.OperacjeIds)
            zlecenie.ZlecenieOperacje.Add(new ZlecenieOperacja { OperacjaId = oId });

        db.ZleceniaNaLot.Add(zlecenie);

        // Kaskadowo: operacje Potwierdzone → Zaplanowane
        var operacje = await db.PlanowaneOperacje
            .Where(o => dto.OperacjeIds.Contains(o.Id)).ToListAsync(ct);

        foreach (var op in operacje.Where(o => o.StatusId == StatusOperacji.PotwierdzoneDoPlan))
        {
            DodajHistorieOperacji(op.Id, "status",
                StatusOperacji.PotwierdzoneDoPlan.ToString(),
                StatusOperacji.ZaplanowaneDoZlecenia.ToString(), user.Id);
            op.StatusId = StatusOperacji.ZaplanowaneDoZlecenia;
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation("Utworzono zlecenie {Numer} przez pilota {UserId}",
            numer, user.Id);

        return ServiceResult<int>.Ok(zlecenie.Id);
    }

    // ── Aktualizacja ──────────────────────────────────────────

    public async Task<ServiceResult> AktualizujAsync(
        int id, AktualizujZlecenieDto dto, CurrentUser user, CancellationToken ct)
    {
        var z = await db.ZleceniaNaLot
            .Include(x => x.CzlonkowieZalogi)
            .Include(x => x.ZlecenieOperacje)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (z is null)
            return ServiceResult.Fail(ServiceErrorKind.NotFound, $"Zlecenie {id} nie istnieje.");

        // ── Punkt 4: Kontrola statusu — czy edycja jest dozwolona ──
        if (!StatusMachine.CzyEdycjaZleceniaDozwolona(user.Rola, z.StatusId))
            return ServiceResult.Fail(ServiceErrorKind.Forbidden,
                $"Brak uprawnień do edycji zlecenia w statusie {z.StatusId} dla roli '{user.Rola}'.");

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var helikopter = await db.Helikoptery.FindAsync([dto.HelikopterId], ct);
        var pilot = await db.CzlonkowieZalogi.FindAsync([z.PilotId], ct);
        if (helikopter is null || pilot is null)
            return ServiceResult.Fail(ServiceErrorKind.Validation,
                "Helikopter lub pilot nie istnieje.");

        var czlonkowie = await db.CzlonkowieZalogi
            .Where(c => dto.CzlonkowieZalogiIds.Contains(c.Id)).ToListAsync(ct);

        // ── Punkt 3: Walidacja biznesowa (identyczna jak przy tworzeniu) ──
        var bledy = WalidujZlecenieWspolne(
            dto.PlanowanyStartDt, dto.SzacowanaDlugoscTrasy,
            pilot, helikopter, czlonkowie);

        if (bledy.Count > 0)
            return ServiceResult.Fail(ServiceErrorKind.Validation, bledy);

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
            z.CzlonkowieZalogi.Add(new ZlecienieCzlonekZalogi
                { ZlecenieId = id, CzlonekId = cId });

        z.ZlecenieOperacje.Clear();
        foreach (var oId in dto.OperacjeIds)
            z.ZlecenieOperacje.Add(new ZlecenieOperacja
                { ZlecenieId = id, OperacjaId = oId });

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return ServiceResult.Ok();
    }

    // ── Zmiana statusu ────────────────────────────────────────

    public async Task<ServiceResult> ZmienStatusAsync(
        int id, ZmienStatusZlecenieDto dto, CurrentUser user, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var z = await db.ZleceniaNaLot
            .Include(x => x.ZlecenieOperacje)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (z is null)
            return ServiceResult.Fail(ServiceErrorKind.NotFound,
                $"Zlecenie {id} nie istnieje.");

        var stary = z.StatusId;

        if (!StatusMachine.CzyPrzejscieZleceniaDozwolone(user.Rola, stary, dto.StatusId))
            return ServiceResult.Fail(ServiceErrorKind.Validation,
                $"Niedozwolona zmiana statusu z {stary} na {dto.StatusId} dla roli '{user.Rola}'.");

        if (dto.StatusId is StatusZlecenia.ZrealizowaneWCzesci or StatusZlecenia.ZrealizowaneWCalosci
            && (z.RzeczywistyStartDt is null || z.RzeczywisteLadowanieDt is null))
            return ServiceResult.Fail(ServiceErrorKind.Validation,
                "Wymagane rzeczywiste czasy startu i lądowania.");

        DodajHistorieZlecenia(id, "status",
            stary.ToString(), dto.StatusId.ToString(), user.Id);
        z.StatusId = dto.StatusId;
        z.UpdatedAt = DateTime.UtcNow;

        // Kaskadowe zmiany statusów operacji
        var operacjeIds = z.ZlecenieOperacje.Select(zo => zo.OperacjaId).ToList();
        var operacje = await db.PlanowaneOperacje
            .Where(o => operacjeIds.Contains(o.Id)).ToListAsync(ct);

        foreach (var op in operacje)
        {
            var nowyStatusOp = StatusMachine.DocelowyStatusOperacjiPrzyZmianieZlecenia(
                dto.StatusId, op.StatusId);

            if (nowyStatusOp.HasValue)
            {
                DodajHistorieOperacji(op.Id, "status",
                    op.StatusId.ToString(), nowyStatusOp.Value.ToString(), user.Id);
                op.StatusId = nowyStatusOp.Value;
            }
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation("Status zlecenia {Id} zmieniony {Stary}→{Nowy}",
            id, stary, dto.StatusId);

        return ServiceResult.Ok();
    }

    // ── Historia ──────────────────────────────────────────────

    public async Task<ServiceResult<List<HistoriaZmianyDto>>> PobierzHistorieAsync(
        int id, CancellationToken ct)
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

        return ServiceResult<List<HistoriaZmianyDto>>.Ok(lista);
    }

    // ── Walidacja biznesowa ───────────────────────────────────

    private static List<string> WalidujZlecenie(
        UtworzZlecenieDto dto, CzlonekZalogi pilot,
        Helikopter helikopter, List<CzlonekZalogi> czlonkowie)
        => WalidujZlecenieWspolne(
            dto.PlanowanyStartDt, dto.SzacowanaDlugoscTrasy,
            pilot, helikopter, czlonkowie);

    /// <summary>
    /// Wspólna walidacja biznesowa dla tworzenia i aktualizacji zlecenia.
    /// Sprawdza ważność przeglądu helikoptera, licencji i szkoleń załogi,
    /// udźwig helikoptera oraz zasięg trasy.
    /// </summary>
    private static List<string> WalidujZlecenieWspolne(
        DateTime planowanyStartDt, int szacowanaDlugoscTrasy,
        CzlonekZalogi pilot, Helikopter helikopter,
        List<CzlonekZalogi> czlonkowie)
    {
        var bledy = new List<string>();
        var dataLotu = DateOnly.FromDateTime(planowanyStartDt);

        if (helikopter.DataWaznosciPrzegladu < dataLotu)
            bledy.Add($"Helikopter {helikopter.NumerRejestracyjny}: nieważny przegląd " +
                      $"({helikopter.DataWaznosciPrzegladu:d}).");

        if (pilot.DataWaznosciLicencji < dataLotu)
            bledy.Add($"Pilot {pilot.Imie} {pilot.Nazwisko}: nieważna licencja " +
                      $"({pilot.DataWaznosciLicencji:d}).");

        if (pilot.DataWaznosciSzkolenia < dataLotu)
            bledy.Add($"Pilot {pilot.Imie} {pilot.Nazwisko}: nieważne szkolenie " +
                      $"({pilot.DataWaznosciSzkolenia:d}).");

        foreach (var c in czlonkowie.Where(c => c.DataWaznosciSzkolenia < dataLotu))
            bledy.Add($"Członek załogi {c.Imie} {c.Nazwisko}: nieważne szkolenie " +
                      $"({c.DataWaznosciSzkolenia:d}).");

        var wagaZalogi = pilot.WagaKg + czlonkowie.Sum(c => c.WagaKg);
        if (wagaZalogi > helikopter.MaksUdzwigKg)
            bledy.Add($"Waga załogi ({wagaZalogi} kg) przekracza udźwig helikoptera " +
                      $"({helikopter.MaksUdzwigKg} kg).");

        if (szacowanaDlugoscTrasy > helikopter.ZasiegKm)
            bledy.Add($"Trasa ({szacowanaDlugoscTrasy} km) przekracza zasięg helikoptera " +
                      $"({helikopter.ZasiegKm} km).");

        return bledy;
    }

    // ── Helpery prywatne ──────────────────────────────────────

    private async Task<ZlecenieNaLot?> PobierzPelneZlecenieAsync(int id, CancellationToken ct) =>
        await db.ZleceniaNaLot
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
        z.ZlecenieOperacje.Select(o => new OperacjaSkrotDto(
            o.OperacjaId, o.Operacja.Numer, o.Operacja.OpisSkrocony,
            o.Operacja.StatusId, o.Operacja.Status.Nazwa)).ToList(),
        z.CreatedAt, z.UpdatedAt);

    private void DodajHistorieZlecenia(int zlecenieId, string pole,
        string? stara, string? nowa, int uzytkownikId)
    {
        db.ZlecenieHistoriaZmian.Add(new ZlecenieHistoriaZmian
        {
            ZlecenieId = zlecenieId, Pole = pole,
            StaraWartosc = stara, NowaWartosc = nowa,
            ZmienionePrzez = uzytkownikId
        });
    }

    private void DodajHistorieOperacji(int operacjaId, string pole,
        string? stara, string? nowa, int uzytkownikId)
    {
        db.OperacjeHistoriaZmian.Add(new OperacjaHistoriaZmian
        {
            OperacjaId = operacjaId, Pole = pole,
            StaraWartosc = stara, NowaWartosc = nowa,
            ZmienionePrzez = uzytkownikId
        });
    }
}
