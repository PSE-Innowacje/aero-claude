using LotyApi.Data;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Services;

public interface INumeratorService
{
    Task<string> NastepnyNumerOperacjiAsync();
    Task<string> NastepnyNumerZleceniaAsync();
}

public class NumeratorService(LotyDbContext db) : INumeratorService
{
    public async Task<string> NastepnyNumerOperacjiAsync()
    {
        var rok = DateTime.UtcNow.Year;
        var ostatni = await db.PlanowaneOperacje
            .Where(o => o.Numer.StartsWith($"OP-{rok}-"))
            .OrderByDescending(o => o.Numer)
            .Select(o => o.Numer)
            .FirstOrDefaultAsync();

        var seq = ostatni is null ? 1 : int.Parse(ostatni.Split('-')[2]) + 1;
        return $"OP-{rok}-{seq:D4}";
    }

    public async Task<string> NastepnyNumerZleceniaAsync()
    {
        var rok = DateTime.UtcNow.Year;
        var ostatni = await db.ZleceniaNaLot
            .Where(z => z.Numer.StartsWith($"ZL-{rok}-"))
            .OrderByDescending(z => z.Numer)
            .Select(z => z.Numer)
            .FirstOrDefaultAsync();

        var seq = ostatni is null ? 1 : int.Parse(ostatni.Split('-')[2]) + 1;
        return $"ZL-{rok}-{seq:D4}";
    }
}
