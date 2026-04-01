using LotyApi.Common;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Services;

public interface ILadowiskoService
{
    Task<ServiceResult<List<LadowiskoDto>>> PobierzWszystkieAsync(CancellationToken ct);
    Task<ServiceResult<LadowiskoDto>> PobierzAsync(int id, CancellationToken ct);
    Task<ServiceResult<int>> UtworzAsync(UtworzLadowiskoDto dto, CancellationToken ct);
    Task<ServiceResult> AktualizujAsync(int id, AktualizujLadowiskoDto dto, CancellationToken ct);
}

public class LadowiskoService(LotyDbContext db) : ILadowiskoService
{
    public async Task<ServiceResult<List<LadowiskoDto>>> PobierzWszystkieAsync(CancellationToken ct)
    {
        var lista = await db.Ladowiska.AsNoTracking()
            .OrderBy(l => l.Nazwa)
            .Select(l => new LadowiskoDto(l.Id, l.Nazwa, l.Szerokosc, l.Dlugosc, l.Opis))
            .ToListAsync(ct);

        return ServiceResult<List<LadowiskoDto>>.Ok(lista);
    }

    public async Task<ServiceResult<LadowiskoDto>> PobierzAsync(int id, CancellationToken ct)
    {
        var l = await db.Ladowiska.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);

        return l is null
            ? ServiceResult<LadowiskoDto>.Fail(ServiceErrorKind.NotFound, $"Lądowisko {id} nie istnieje.")
            : ServiceResult<LadowiskoDto>.Ok(new LadowiskoDto(l.Id, l.Nazwa, l.Szerokosc, l.Dlugosc, l.Opis));
    }

    public async Task<ServiceResult<int>> UtworzAsync(UtworzLadowiskoDto dto, CancellationToken ct)
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

    public async Task<ServiceResult> AktualizujAsync(int id, AktualizujLadowiskoDto dto, CancellationToken ct)
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
}
