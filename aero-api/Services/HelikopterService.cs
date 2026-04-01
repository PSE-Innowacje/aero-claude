using LotyApi.Common;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Services;

public interface IHelikopterService
{
    Task<ServiceResult<List<HelikopterDto>>> PobierzWszystkieAsync(CancellationToken ct);
    Task<ServiceResult<HelikopterDto>> PobierzAsync(int id, CancellationToken ct);
    Task<ServiceResult<int>> UtworzAsync(UtworzHelikopterDto dto, CancellationToken ct);
    Task<ServiceResult> AktualizujAsync(int id, AktualizujHelikopterDto dto, CancellationToken ct);
}

public class HelikopterService(LotyDbContext db) : IHelikopterService
{
    public async Task<ServiceResult<List<HelikopterDto>>> PobierzWszystkieAsync(CancellationToken ct)
    {
        var lista = await db.Helikoptery.AsNoTracking()
            .OrderBy(h => h.Status).ThenBy(h => h.NumerRejestracyjny)
            .Select(h => ToDto(h))
            .ToListAsync(ct);

        return ServiceResult<List<HelikopterDto>>.Ok(lista);
    }

    public async Task<ServiceResult<HelikopterDto>> PobierzAsync(int id, CancellationToken ct)
    {
        var h = await db.Helikoptery.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);

        return h is null
            ? ServiceResult<HelikopterDto>.Fail(ServiceErrorKind.NotFound, $"Helikopter {id} nie istnieje.")
            : ServiceResult<HelikopterDto>.Ok(ToDto(h));
    }

    public async Task<ServiceResult<int>> UtworzAsync(UtworzHelikopterDto dto, CancellationToken ct)
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

    public async Task<ServiceResult> AktualizujAsync(int id, AktualizujHelikopterDto dto, CancellationToken ct)
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

    private static HelikopterDto ToDto(Helikopter h) =>
        new(h.Id, h.NumerRejestracyjny, h.Typ, h.Opis,
            h.MaksLiczbaCzlonkowZalogi, h.MaksUdzwigKg, h.ZasiegKm,
            h.Status, h.DataWaznosciPrzegladu);
}
