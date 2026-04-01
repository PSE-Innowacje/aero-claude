using LotyApi.Common;
using LotyApi.Data;
using LotyApi.DTOs;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Services;

public enum TypSlownika
{
    RoleUzytkownikow,
    RoleZalogi,
    RodzajeCzynnosci,
    StatusyOperacji,
    StatusyZlecen,
}

public interface ISlownikService
{
    Task<ServiceResult<List<SlownikDto>>> PobierzAsync(TypSlownika typ, CancellationToken ct);
}

public class SlownikService(LotyDbContext db) : ISlownikService
{
    public async Task<ServiceResult<List<SlownikDto>>> PobierzAsync(
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
}
