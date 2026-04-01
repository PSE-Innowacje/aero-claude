using LotyApi.Common;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Services;

public interface IOperacjaService
{
    Task<ServiceResult<PagedResult<OperacjaListDto>>> PobierzListeAsync(
        OperacjeQuery query, CancellationToken ct);

    Task<ServiceResult<OperacjaDto>> PobierzSzczegolyAsync(int id, CancellationToken ct);

    Task<ServiceResult<int>> UtworzAsync(
        UtworzOperacjeDto dto, CurrentUser user, CancellationToken ct);

    Task<ServiceResult> AktualizujAsync(
        int id, AktualizujOperacjeDto dto, CurrentUser user, CancellationToken ct);

    Task<ServiceResult> ZmienStatusAsync(
        int id, ZmienStatusOperacjiDto dto, CurrentUser user, CancellationToken ct);

    Task<ServiceResult<List<KomentarzDto>>> PobierzKomentarzeAsync(int id, CancellationToken ct);

    Task<ServiceResult<int>> DodajKomentarzAsync(
        int id, DodajKomentarzDto dto, CurrentUser user, CancellationToken ct);

    Task<ServiceResult<List<HistoriaZmianyDto>>> PobierzHistorieAsync(int id, CancellationToken ct);

    Task<ServiceResult<List<UzytkownikDto>>> PobierzOsobyKontaktoweAsync(CancellationToken ct);
}

public class OperacjaService(
    LotyDbContext db,
    INumeratorService numerator,
    IUzytkownikService uzytkownikService,
    ILogger<OperacjaService> logger) : IOperacjaService
{
    // ── Lista ─────────────────────────────────────────────────

    public async Task<ServiceResult<PagedResult<OperacjaListDto>>> PobierzListeAsync(
        OperacjeQuery q, CancellationToken ct)
    {
        var query = db.PlanowaneOperacje
            .Include(o => o.Status)
            .Include(o => o.RodzajeCzynnosci).ThenInclude(r => r.RodzajCzynnosci)
            .AsNoTracking()
            .AsQueryable();

        if (q.StatusId.HasValue)
            query = query.Where(o => o.StatusId == q.StatusId.Value);
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
                o.LiczbaKmTrasy,
                o.RodzajeCzynnosci.Select(r => r.RodzajCzynnosci.Nazwa).ToList(),
                o.ProponowanaDataOd, o.ProponowanaDataDo,
                o.PlanowanaDataOd, o.PlanowanaDataDo,
                o.StatusId, o.Status.Nazwa))
            .ToListAsync(ct);

        return ServiceResult<PagedResult<OperacjaListDto>>.Ok(new PagedResult<OperacjaListDto>
        {
            Items = items, Strona = req.Strona,
            RozmiarStrony = req.RozmiarStrony, LacznaLiczba = total
        });
    }

    // ── Szczegóły ─────────────────────────────────────────────

    public async Task<ServiceResult<OperacjaDto>> PobierzSzczegolyAsync(int id, CancellationToken ct)
    {
        var o = await PobierzPelnaOperacjeAsync(id, ct);
        if (o is null)
            return ServiceResult<OperacjaDto>.Fail(
                ServiceErrorKind.NotFound, $"Operacja {id} nie istnieje.");

        return ServiceResult<OperacjaDto>.Ok(MapDoDto(o));
    }

    // ── Tworzenie ─────────────────────────────────────────────

    public async Task<ServiceResult<int>> UtworzAsync(
        UtworzOperacjeDto dto, CurrentUser user, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var numer = await numerator.NastepnyNumerOperacjiAsync(ct);

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
            WprowadzajacyId = user.Id
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

        DodajHistorie(operacja.Id, "status",
            null, StatusOperacji.Wprowadzone.ToString(), user.Id);
        await db.SaveChangesAsync(ct);

        await transaction.CommitAsync(ct);

        logger.LogInformation("Utworzono operację {Numer} przez użytkownika {UserId}",
            numer, user.Id);

        return ServiceResult<int>.Ok(operacja.Id);
    }

    // ── Aktualizacja ──────────────────────────────────────────

    public async Task<ServiceResult> AktualizujAsync(
        int id, AktualizujOperacjeDto dto, CurrentUser user, CancellationToken ct)
    {
        var o = await db.PlanowaneOperacje
            .Include(x => x.RodzajeCzynnosci)
            .Include(x => x.PunktyTrasy)
            .Include(x => x.OsobyKontaktowe)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (o is null)
            return ServiceResult.Fail(ServiceErrorKind.NotFound, $"Operacja {id} nie istnieje.");

        if (!StatusMachine.CzyEdycjaOperacjiDozwolona(user.Rola, o.StatusId))
            return ServiceResult.Fail(ServiceErrorKind.Forbidden,
                "Brak uprawnień do edycji operacji w tym statusie.");

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        // Pola wspólne
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

        // Pola tylko dla osoby nadzorującej
        if (user.Rola == Role.OsobaNadzorujaca || user.Rola == Role.Administrator)
        {
            DodajHistorieJesliZmiana(o.Id, "planowana_data_od",
                o.PlanowanaDataOd?.ToString(), dto.PlanowanaDataOd?.ToString(), user.Id);
            DodajHistorieJesliZmiana(o.Id, "planowana_data_do",
                o.PlanowanaDataDo?.ToString(), dto.PlanowanaDataDo?.ToString(), user.Id);
            o.PlanowanaDataOd = dto.PlanowanaDataOd;
            o.PlanowanaDataDo = dto.PlanowanaDataDo;
            o.UwagiPoRealizacji = dto.UwagiPoRealizacji;
        }

        // Kolekcje — wymiana
        o.RodzajeCzynnosci.Clear();
        foreach (var rcId in dto.RodzajeCzynnosciIds)
            o.RodzajeCzynnosci.Add(new OperacjaRodzajCzynnosci
                { OperacjaId = id, RodzajCzynnosciId = rcId });

        o.PunktyTrasy.Clear();
        foreach (var p in dto.PunktyTrasy)
            o.PunktyTrasy.Add(new OperacjaPunktTrasy
                { OperacjaId = id, Kolejnosc = p.Kolejnosc, Szerokosc = p.Szerokosc, Dlugosc = p.Dlugosc });

        o.OsobyKontaktowe.Clear();
        foreach (var uid in dto.OsobyKontaktoweIds)
            o.OsobyKontaktowe.Add(new OperacjaOsobaKontaktowa
                { OperacjaId = id, UzytkownikId = uid });

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return ServiceResult.Ok();
    }

    // ── Zmiana statusu ────────────────────────────────────────

    public async Task<ServiceResult> ZmienStatusAsync(
        int id, ZmienStatusOperacjiDto dto, CurrentUser user, CancellationToken ct)
    {
        var o = await db.PlanowaneOperacje.FindAsync([id], ct);
        if (o is null)
            return ServiceResult.Fail(ServiceErrorKind.NotFound, $"Operacja {id} nie istnieje.");

        var stary = o.StatusId;

        if (!StatusMachine.CzyPrzejscieOperacjiDozwolone(user.Rola, stary, dto.StatusId))
            return ServiceResult.Fail(ServiceErrorKind.Validation,
                $"Niedozwolona zmiana statusu z {stary} na {dto.StatusId} dla roli '{user.Rola}'.");

        if (dto.StatusId == StatusOperacji.PotwierdzoneDoPlan
            && (o.PlanowanaDataOd is null || o.PlanowanaDataDo is null))
            return ServiceResult.Fail(ServiceErrorKind.Validation,
                "Wymagane planowane daty przed potwierdzeniem.");

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        DodajHistorie(id, "status", stary.ToString(), dto.StatusId.ToString(), user.Id);
        o.StatusId = dto.StatusId;
        if (dto.Komentarz is not null) o.Komentarz = dto.Komentarz;
        o.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation("Status operacji {Id} zmieniony {Stary}→{Nowy}",
            id, stary, dto.StatusId);

        return ServiceResult.Ok();
    }

    // ── Komentarze ────────────────────────────────────────────

    public async Task<ServiceResult<List<KomentarzDto>>> PobierzKomentarzeAsync(
        int id, CancellationToken ct)
    {
        if (!await db.PlanowaneOperacje.AnyAsync(o => o.Id == id, ct))
            return ServiceResult<List<KomentarzDto>>.Fail(
                ServiceErrorKind.NotFound, $"Operacja {id} nie istnieje.");

        var lista = await db.OperacjeKomentarze
            .Include(k => k.Autor)
            .Where(k => k.OperacjaId == id)
            .OrderBy(k => k.CreatedAt)
            .AsNoTracking()
            .Select(k => new KomentarzDto(k.Id, k.Tresc, k.Autor.Email, k.CreatedAt))
            .ToListAsync(ct);

        return ServiceResult<List<KomentarzDto>>.Ok(lista);
    }

    public async Task<ServiceResult<int>> DodajKomentarzAsync(
        int id, DodajKomentarzDto dto, CurrentUser user, CancellationToken ct)
    {
        if (!await db.PlanowaneOperacje.AnyAsync(o => o.Id == id, ct))
            return ServiceResult<int>.Fail(
                ServiceErrorKind.NotFound, $"Operacja {id} nie istnieje.");

        var komentarz = new OperacjaKomentarz
            { OperacjaId = id, Tresc = dto.Tresc, AutorId = user.Id };
        db.OperacjeKomentarze.Add(komentarz);
        await db.SaveChangesAsync(ct);
        return ServiceResult<int>.Ok(komentarz.Id);
    }

    // ── Historia ──────────────────────────────────────────────

    public async Task<ServiceResult<List<HistoriaZmianyDto>>> PobierzHistorieAsync(
        int id, CancellationToken ct)
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

        return ServiceResult<List<HistoriaZmianyDto>>.Ok(lista);
    }

    // ── Osoby kontaktowe ──────────────────────────────────────

    public Task<ServiceResult<List<UzytkownikDto>>> PobierzOsobyKontaktoweAsync(
        CancellationToken ct) =>
        uzytkownikService.PobierzKontaktyAsync(ct);

    // ── Helpery prywatne ──────────────────────────────────────

    private async Task<PlanowanaOperacja?> PobierzPelnaOperacjeAsync(int id, CancellationToken ct) =>
        await db.PlanowaneOperacje
            .Include(x => x.Status)
            .Include(x => x.Wprowadzajacy)
            .Include(x => x.RodzajeCzynnosci).ThenInclude(r => r.RodzajCzynnosci)
            .Include(x => x.PunktyTrasy)
            .Include(x => x.OsobyKontaktowe)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

    private static OperacjaDto MapDoDto(PlanowanaOperacja o) => new(
        o.Id, o.Numer, o.NumerZleceniaProjektu, o.OpisSkrocony,
        o.KmlNazwaPliku, o.KmlZawartosc, o.LiczbaKmTrasy,
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

    private void DodajHistorie(int operacjaId, string pole,
        string? stara, string? nowa, int uzytkownikId)
    {
        db.OperacjeHistoriaZmian.Add(new OperacjaHistoriaZmian
        {
            OperacjaId = operacjaId, Pole = pole,
            StaraWartosc = stara, NowaWartosc = nowa,
            ZmienionePrzez = uzytkownikId
        });
    }

    private void DodajHistorieJesliZmiana(int operacjaId, string pole,
        string? stara, string? nowa, int uzytkownikId)
    {
        if (stara == nowa) return;
        DodajHistorie(operacjaId, pole, stara, nowa, uzytkownikId);
    }
}
