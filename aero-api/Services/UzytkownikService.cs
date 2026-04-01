using LotyApi.Common;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Services;

public interface IUzytkownikService
{
    Task<ServiceResult<List<UzytkownikDto>>> PobierzWszystkichAsync(CancellationToken ct);
    Task<ServiceResult<UzytkownikDto>> PobierzAsync(int id, CancellationToken ct);
    Task<ServiceResult<int>> UtworzAsync(UtworzUzytkownikaDto dto, CancellationToken ct);
    Task<ServiceResult> AktualizujAsync(int id, AktualizujUzytkownikaDto dto, CancellationToken ct);
    Task<ServiceResult<List<UzytkownikDto>>> PobierzKontaktyAsync(CancellationToken ct);
}

public class UzytkownikService(LotyDbContext db, IAuthService authService) : IUzytkownikService
{
    public async Task<ServiceResult<List<UzytkownikDto>>> PobierzWszystkichAsync(CancellationToken ct)
    {
        var lista = await db.Uzytkownicy
            .Include(u => u.Rola)
            .AsNoTracking()
            .OrderBy(u => u.Email)
            .Select(u => ToDto(u))
            .ToListAsync(ct);

        return ServiceResult<List<UzytkownikDto>>.Ok(lista);
    }

    public async Task<ServiceResult<UzytkownikDto>> PobierzAsync(int id, CancellationToken ct)
    {
        var u = await db.Uzytkownicy.Include(x => x.Rola).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        return u is null
            ? ServiceResult<UzytkownikDto>.Fail(ServiceErrorKind.NotFound, $"Użytkownik {id} nie istnieje.")
            : ServiceResult<UzytkownikDto>.Ok(ToDto(u));
    }

    public async Task<ServiceResult<int>> UtworzAsync(UtworzUzytkownikaDto dto, CancellationToken ct)
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

    public async Task<ServiceResult> AktualizujAsync(int id, AktualizujUzytkownikaDto dto, CancellationToken ct)
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
            .Select(u => ToDto(u))
            .ToListAsync(ct);

        return ServiceResult<List<UzytkownikDto>>.Ok(lista);
    }

    private static UzytkownikDto ToDto(Uzytkownik u) =>
        new(u.Id, u.Imie, u.Nazwisko, u.Email, u.RolaId, u.Rola.Nazwa, u.Aktywny);
}
