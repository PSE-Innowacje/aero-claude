using LotyApi.Data;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Services;

public interface INumeratorService
{
    Task<string> NastepnyNumerOperacjiAsync();
    Task<string> NastepnyNumerZleceniaAsync();
}

/// <summary>
/// Generuje unikalne numery operacji i zleceń.
/// Używa SemaphoreSlim do uniknięcia race condition (TOCTOU).
/// Unique index na kolumnie Numer stanowi dodatkowe zabezpieczenie.
/// </summary>
public class NumeratorService(LotyDbContext db) : INumeratorService
{
    private static readonly SemaphoreSlim _lockOperacje = new(1, 1);
    private static readonly SemaphoreSlim _lockZlecenia = new(1, 1);

    public async Task<string> NastepnyNumerOperacjiAsync()
    {
        await _lockOperacje.WaitAsync();
        try
        {
            var rok = DateTime.UtcNow.Year;
            var prefix = $"OP-{rok}-";
            var ostatni = await db.PlanowaneOperacje
                .Where(o => o.Numer.StartsWith(prefix))
                .OrderByDescending(o => o.Numer)
                .Select(o => o.Numer)
                .FirstOrDefaultAsync();

            var seq = ostatni is null ? 1 : int.Parse(ostatni.Split('-')[2]) + 1;
            return $"OP-{rok}-{seq:D4}";
        }
        finally
        {
            _lockOperacje.Release();
        }
    }

    public async Task<string> NastepnyNumerZleceniaAsync()
    {
        await _lockZlecenia.WaitAsync();
        try
        {
            var rok = DateTime.UtcNow.Year;
            var prefix = $"ZL-{rok}-";
            var ostatni = await db.ZleceniaNaLot
                .Where(z => z.Numer.StartsWith(prefix))
                .OrderByDescending(z => z.Numer)
                .Select(z => z.Numer)
                .FirstOrDefaultAsync();

            var seq = ostatni is null ? 1 : int.Parse(ostatni.Split('-')[2]) + 1;
            return $"ZL-{rok}-{seq:D4}";
        }
        finally
        {
            _lockZlecenia.Release();
        }
    }
}
