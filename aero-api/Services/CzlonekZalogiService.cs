using LotyApi.Common;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Services;

public interface ICzlonekZalogiService
{
    Task<ServiceResult<List<CzlonekZalogiDto>>> PobierzWszystkichAsync(CancellationToken ct);
    Task<ServiceResult<CzlonekZalogiDto>> PobierzAsync(int id, CancellationToken ct);
    Task<ServiceResult<int>> UtworzAsync(UtworzCzlonkaZalogiDto dto, CancellationToken ct);
    Task<ServiceResult> AktualizujAsync(int id, AktualizujCzlonkaZalogiDto dto, CancellationToken ct);
}

public class CzlonekZalogiService(LotyDbContext db) : ICzlonekZalogiService
{
    public async Task<ServiceResult<List<CzlonekZalogiDto>>> PobierzWszystkichAsync(CancellationToken ct)
    {
        var lista = await db.CzlonkowieZalogi.Include(c => c.Rola).AsNoTracking()
            .OrderBy(c => c.Email)
            .Select(c => ToDto(c))
            .ToListAsync(ct);

        return ServiceResult<List<CzlonekZalogiDto>>.Ok(lista);
    }

    public async Task<ServiceResult<CzlonekZalogiDto>> PobierzAsync(int id, CancellationToken ct)
    {
        var c = await db.CzlonkowieZalogi.Include(x => x.Rola).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        return c is null
            ? ServiceResult<CzlonekZalogiDto>.Fail(ServiceErrorKind.NotFound, $"Członek załogi {id} nie istnieje.")
            : ServiceResult<CzlonekZalogiDto>.Ok(ToDto(c));
    }

    public async Task<ServiceResult<int>> UtworzAsync(UtworzCzlonkaZalogiDto dto, CancellationToken ct)
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

    public async Task<ServiceResult> AktualizujAsync(int id, AktualizujCzlonkaZalogiDto dto, CancellationToken ct)
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

    private static CzlonekZalogiDto ToDto(CzlonekZalogi c) =>
        new(c.Id, c.Imie, c.Nazwisko, c.Email, c.WagaKg,
            c.RolaId, c.Rola?.Nazwa ?? "",
            c.NrLicencjiPilota, c.DataWaznosciLicencji,
            c.DataWaznosciSzkolenia, c.Aktywny);
}
