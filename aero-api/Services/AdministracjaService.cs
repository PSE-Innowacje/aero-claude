using LotyApi.Common;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Services;

// ── Interfejs ─────────────────────────────────────────────────

public interface IAdministracjaService
{
    // Użytkownicy
    Task<ServiceResult<List<UzytkownikDto>>> PobierzUzytkownikowAsync(CancellationToken ct);
    Task<ServiceResult<UzytkownikDto>> PobierzUzytkownikaAsync(int id, CancellationToken ct);
    Task<ServiceResult<int>> UtworzUzytkownikaAsync(UtworzUzytkownikaDto dto, CancellationToken ct);
    Task<ServiceResult> AktualizujUzytkownikaAsync(int id, AktualizujUzytkownikaDto dto, CancellationToken ct);
    Task<ServiceResult<List<UzytkownikDto>>> PobierzKontaktyAsync(CancellationToken ct);

    // Helikoptery
    Task<ServiceResult<List<HelikopterDto>>> PobierzHelikopteryAsync(CancellationToken ct);
    Task<ServiceResult<HelikopterDto>> PobierzHelikopterAsync(int id, CancellationToken ct);
    Task<ServiceResult<int>> UtworzHelikopterAsync(UtworzHelikopterDto dto, CancellationToken ct);
    Task<ServiceResult> AktualizujHelikopterAsync(int id, AktualizujHelikopterDto dto, CancellationToken ct);

    // Członkowie załogi
    Task<ServiceResult<List<CzlonekZalogiDto>>> PobierzCzlonkowZalogiAsync(CancellationToken ct);
    Task<ServiceResult<CzlonekZalogiDto>> PobierzCzlonkaZalogiAsync(int id, CancellationToken ct);
    Task<ServiceResult<int>> UtworzCzlonkaZalogiAsync(UtworzCzlonkaZalogiDto dto, CancellationToken ct);
    Task<ServiceResult> AktualizujCzlonkaZalogiAsync(int id, AktualizujCzlonkaZalogiDto dto, CancellationToken ct);

    // Lądowiska
    Task<ServiceResult<List<LadowiskoDto>>> PobierzLadowiskaAsync(CancellationToken ct);
    Task<ServiceResult<LadowiskoDto>> PobierzLadowiskoAsync(int id, CancellationToken ct);
    Task<ServiceResult<int>> UtworzLadowiskoAsync(UtworzLadowiskoDto dto, CancellationToken ct);
    Task<ServiceResult> AktualizujLadowiskoAsync(int id, AktualizujLadowiskoDto dto, CancellationToken ct);

    // Słowniki
    Task<ServiceResult<List<SlownikDto>>> PobierzSlownikAsync(TypSlownika typ, CancellationToken ct);
}

public enum TypSlownika
{
    RoleUzytkownikow,
    RoleZalogi,
    RodzajeCzynnosci,
    StatusyOperacji,
    StatusyZlecen,
}

// ── Implementacja ─────────────────────────────────────────────

public class AdministracjaService(LotyDbContext db, IAuthService authService) : IAdministracjaService
{
    // ── Użytkownicy ───────────────────────────────────────────

    public async Task<ServiceResult<List<UzytkownikDto>>> PobierzUzytkownikowAsync(CancellationToken ct)
    {
        var lista = await db.Uzytkownicy
            .Include(u => u.Rola)
            .AsNoTracking()
            .OrderBy(u => u.Email)
            .Select(u => MapUzytkownikDto(u))
            .ToListAsync(ct);

        return ServiceResult<List<UzytkownikDto>>.Ok(lista);
    }

    public async Task<ServiceResult<UzytkownikDto>> PobierzUzytkownikaAsync(int id, CancellationToken ct)
    {
        var u = await db.Uzytkownicy.Include(x => x.Rola).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (u is null)
            return ServiceResult<UzytkownikDto>.Fail(
                ServiceErrorKind.NotFound, $"Użytkownik {id} nie istnieje.");

        return ServiceResult<UzytkownikDto>.Ok(MapUzytkownikDto(u));
    }

    public async Task<ServiceResult<int>> UtworzUzytkownikaAsync(
        UtworzUzytkownikaDto dto, CancellationToken ct)
    {
        if (await db.Uzytkownicy.AnyAsync(u => u.Email == dto.Email, ct))
            return ServiceResult<int>.Fail(ServiceErrorKind.Conflict,
                $"Użytkownik z emailem '{dto.Email}' już istnieje.");

        var uzytkownik = new Uzytkownik
        {
            Imie = dto.Imie,
            Nazwisko = dto.Nazwisko,
            Email = dto.Email,
            HasloHash = authService.HashPassword(dto.Haslo),
            RolaId = dto.RolaId
        };
        db.Uzytkownicy.Add(uzytkownik);
        await db.SaveChangesAsync(ct);
        return ServiceResult<int>.Ok(uzytkownik.Id);
    }

    public async Task<ServiceResult> AktualizujUzytkownikaAsync(
        int id, AktualizujUzytkownikaDto dto, CancellationToken ct)
    {
        var u = await db.Uzytkownicy.FindAsync([id], ct);
        if (u is null)
            return ServiceResult.Fail(ServiceErrorKind.NotFound, $"Użytkownik {id} nie istnieje.");

        u.Imie = dto.Imie;
        u.Nazwisko = dto.Nazwisko;
        u.Email = dto.Email;
        u.RolaId = dto.RolaId;
        u.Aktywny = dto.Aktywny;
        u.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult<List<UzytkownikDto>>> PobierzKontaktyAsync(CancellationToken ct)
    {
        var lista = await db.Uzytkownicy
            .Include(u => u.Rola)
            .AsNoTracking()
            .Where(u => u.Aktywny)
            .OrderBy(u => u.Nazwisko).ThenBy(u => u.Imie)
            .Select(u => MapUzytkownikDto(u))
            .ToListAsync(ct);

        return ServiceResult<List<UzytkownikDto>>.Ok(lista);
    }

    // ── Helikoptery ───────────────────────────────────────────

    public async Task<ServiceResult<List<HelikopterDto>>> PobierzHelikopteryAsync(CancellationToken ct)
    {
        var lista = await db.Helikoptery.AsNoTracking()
            .OrderBy(h => h.Status).ThenBy(h => h.NumerRejestracyjny)
            .Select(h => MapHelikopterDto(h))
            .ToListAsync(ct);

        return ServiceResult<List<HelikopterDto>>.Ok(lista);
    }

    public async Task<ServiceResult<HelikopterDto>> PobierzHelikopterAsync(int id, CancellationToken ct)
    {
        var h = await db.Helikoptery.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (h is null)
            return ServiceResult<HelikopterDto>.Fail(
                ServiceErrorKind.NotFound, $"Helikopter {id} nie istnieje.");

        return ServiceResult<HelikopterDto>.Ok(MapHelikopterDto(h));
    }

    public async Task<ServiceResult<int>> UtworzHelikopterAsync(
        UtworzHelikopterDto dto, CancellationToken ct)
    {
        var h = new Helikopter
        {
            NumerRejestracyjny = dto.NumerRejestracyjny,
            Typ = dto.Typ,
            Opis = dto.Opis,
            MaksLiczbaCzlonkowZalogi = dto.MaksLiczbaCzlonkowZalogi,
            MaksUdzwigKg = dto.MaksUdzwigKg,
            ZasiegKm = dto.ZasiegKm,
            Status = dto.Status,
            DataWaznosciPrzegladu = dto.DataWaznosciPrzegladu
        };
        db.Helikoptery.Add(h);
        await db.SaveChangesAsync(ct);
        return ServiceResult<int>.Ok(h.Id);
    }

    public async Task<ServiceResult> AktualizujHelikopterAsync(
        int id, AktualizujHelikopterDto dto, CancellationToken ct)
    {
        var h = await db.Helikoptery.FindAsync([id], ct);
        if (h is null)
            return ServiceResult.Fail(ServiceErrorKind.NotFound, $"Helikopter {id} nie istnieje.");

        h.NumerRejestracyjny = dto.NumerRejestracyjny;
        h.Typ = dto.Typ;
        h.Opis = dto.Opis;
        h.MaksLiczbaCzlonkowZalogi = dto.MaksLiczbaCzlonkowZalogi;
        h.MaksUdzwigKg = dto.MaksUdzwigKg;
        h.ZasiegKm = dto.ZasiegKm;
        h.Status = dto.Status;
        h.DataWaznosciPrzegladu = dto.DataWaznosciPrzegladu;
        h.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ServiceResult.Ok();
    }

    // ── Członkowie załogi ─────────────────────────────────────

    public async Task<ServiceResult<List<CzlonekZalogiDto>>> PobierzCzlonkowZalogiAsync(CancellationToken ct)
    {
        var lista = await db.CzlonkowieZalogi.Include(c => c.Rola).AsNoTracking()
            .OrderBy(c => c.Email)
            .Select(c => MapCzlonekDto(c))
            .ToListAsync(ct);

        return ServiceResult<List<CzlonekZalogiDto>>.Ok(lista);
    }

    public async Task<ServiceResult<CzlonekZalogiDto>> PobierzCzlonkaZalogiAsync(int id, CancellationToken ct)
    {
        var c = await db.CzlonkowieZalogi.Include(x => x.Rola).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (c is null)
            return ServiceResult<CzlonekZalogiDto>.Fail(
                ServiceErrorKind.NotFound, $"Członek załogi {id} nie istnieje.");

        return ServiceResult<CzlonekZalogiDto>.Ok(MapCzlonekDto(c));
    }

    public async Task<ServiceResult<int>> UtworzCzlonkaZalogiAsync(
        UtworzCzlonkaZalogiDto dto, CancellationToken ct)
    {
        var c = new CzlonekZalogi
        {
            Imie = dto.Imie,
            Nazwisko = dto.Nazwisko,
            Email = dto.Email,
            WagaKg = dto.WagaKg,
            RolaId = dto.RolaId,
            NrLicencjiPilota = dto.NrLicencjiPilota,
            DataWaznosciLicencji = dto.DataWaznosciLicencji,
            DataWaznosciSzkolenia = dto.DataWaznosciSzkolenia
        };
        db.CzlonkowieZalogi.Add(c);
        await db.SaveChangesAsync(ct);
        return ServiceResult<int>.Ok(c.Id);
    }

    public async Task<ServiceResult> AktualizujCzlonkaZalogiAsync(
        int id, AktualizujCzlonkaZalogiDto dto, CancellationToken ct)
    {
        var c = await db.CzlonkowieZalogi.FindAsync([id], ct);
        if (c is null)
            return ServiceResult.Fail(ServiceErrorKind.NotFound, $"Członek załogi {id} nie istnieje.");

        c.Imie = dto.Imie;
        c.Nazwisko = dto.Nazwisko;
        c.Email = dto.Email;
        c.WagaKg = dto.WagaKg;
        c.RolaId = dto.RolaId;
        c.NrLicencjiPilota = dto.NrLicencjiPilota;
        c.DataWaznosciLicencji = dto.DataWaznosciLicencji;
        c.DataWaznosciSzkolenia = dto.DataWaznosciSzkolenia;
        c.Aktywny = dto.Aktywny;
        c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ServiceResult.Ok();
    }

    // ── Lądowiska ─────────────────────────────────────────────

    public async Task<ServiceResult<List<LadowiskoDto>>> PobierzLadowiskaAsync(CancellationToken ct)
    {
        var lista = await db.Ladowiska.AsNoTracking()
            .OrderBy(l => l.Nazwa)
            .Select(l => new LadowiskoDto(l.Id, l.Nazwa, l.Szerokosc, l.Dlugosc, l.Opis))
            .ToListAsync(ct);

        return ServiceResult<List<LadowiskoDto>>.Ok(lista);
    }

    public async Task<ServiceResult<LadowiskoDto>> PobierzLadowiskoAsync(int id, CancellationToken ct)
    {
        var l = await db.Ladowiska.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (l is null)
            return ServiceResult<LadowiskoDto>.Fail(
                ServiceErrorKind.NotFound, $"Lądowisko {id} nie istnieje.");

        return ServiceResult<LadowiskoDto>.Ok(
            new LadowiskoDto(l.Id, l.Nazwa, l.Szerokosc, l.Dlugosc, l.Opis));
    }

    public async Task<ServiceResult<int>> UtworzLadowiskoAsync(
        UtworzLadowiskoDto dto, CancellationToken ct)
    {
        var l = new Ladowisko
        {
            Nazwa = dto.Nazwa,
            Szerokosc = dto.Szerokosc,
            Dlugosc = dto.Dlugosc,
            Opis = dto.Opis
        };
        db.Ladowiska.Add(l);
        await db.SaveChangesAsync(ct);
        return ServiceResult<int>.Ok(l.Id);
    }

    public async Task<ServiceResult> AktualizujLadowiskoAsync(
        int id, AktualizujLadowiskoDto dto, CancellationToken ct)
    {
        var l = await db.Ladowiska.FindAsync([id], ct);
        if (l is null)
            return ServiceResult.Fail(ServiceErrorKind.NotFound, $"Lądowisko {id} nie istnieje.");

        l.Nazwa = dto.Nazwa;
        l.Szerokosc = dto.Szerokosc;
        l.Dlugosc = dto.Dlugosc;
        l.Opis = dto.Opis;
        l.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return ServiceResult.Ok();
    }

    // ── Słowniki ──────────────────────────────────────────────

    public async Task<ServiceResult<List<SlownikDto>>> PobierzSlownikAsync(
        TypSlownika typ, CancellationToken ct)
    {
        List<SlownikDto> lista = typ switch
        {
            TypSlownika.RoleUzytkownikow => await db.SlownikRolUzytkownikow.AsNoTracking()
                .Select(x => new SlownikDto(x.Id, x.Nazwa)).ToListAsync(ct),
            TypSlownika.RoleZalogi => await db.SlownikRolZalogi.AsNoTracking()
                .Select(x => new SlownikDto(x.Id, x.Nazwa)).ToListAsync(ct),
            TypSlownika.RodzajeCzynnosci => await db.SlownikRodzajowCzynnosci.AsNoTracking()
                .Select(x => new SlownikDto(x.Id, x.Nazwa)).ToListAsync(ct),
            TypSlownika.StatusyOperacji => await db.SlownikStatusowOperacji.AsNoTracking()
                .Select(x => new SlownikDto(x.Id, x.Nazwa)).ToListAsync(ct),
            TypSlownika.StatusyZlecen => await db.SlownikStatusowZlecen.AsNoTracking()
                .Select(x => new SlownikDto(x.Id, x.Nazwa)).ToListAsync(ct),
            _ => []
        };

        return ServiceResult<List<SlownikDto>>.Ok(lista);
    }

    // ── Mapowanie ─────────────────────────────────────────────

    private static UzytkownikDto MapUzytkownikDto(Uzytkownik u) =>
        new(u.Id, u.Imie, u.Nazwisko, u.Email, u.RolaId, u.Rola.Nazwa, u.Aktywny);

    private static HelikopterDto MapHelikopterDto(Helikopter h) =>
        new(h.Id, h.NumerRejestracyjny, h.Typ, h.Opis,
            h.MaksLiczbaCzlonkowZalogi, h.MaksUdzwigKg, h.ZasiegKm,
            h.Status, h.DataWaznosciPrzegladu);

    private static CzlonekZalogiDto MapCzlonekDto(CzlonekZalogi c) =>
        new(c.Id, c.Imie, c.Nazwisko, c.Email, c.WagaKg,
            c.RolaId, c.Rola?.Nazwa ?? "",
            c.NrLicencjiPilota, c.DataWaznosciLicencji,
            c.DataWaznosciSzkolenia, c.Aktywny);
}
