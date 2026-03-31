namespace LotyApi.Common;

// ── Ujednolicona odpowiedź API ───────────────────────────────

/// <summary>
/// Opakowanie wyniku operacji. Każda odpowiedź sukcesu ma pole <c>data</c>,
/// każdy błąd ma pole <c>errors</c>.
/// </summary>
public class ApiResult<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public IReadOnlyList<string> Errors { get; init; } = [];

    public static ApiResult<T> Ok(T data) =>
        new() { Success = true, Data = data };

    public static ApiResult<T> Fail(params string[] errors) =>
        new() { Success = false, Errors = errors };

    public static ApiResult<T> Fail(IEnumerable<string> errors) =>
        new() { Success = false, Errors = errors.ToList() };
}

public class ApiResult : ApiResult<object?>
{
    public static ApiResult Ok() =>
        new() { Success = true };

    public new static ApiResult Fail(params string[] errors) =>
        new() { Success = false, Errors = errors };
}

// ── Paginacja ────────────────────────────────────────────────

public record PagedRequest(int Strona = 1, int RozmiarStrony = 20)
{
    public int Strona { get; init; } = Math.Max(1, Strona);
    public int RozmiarStrony { get; init; } = Math.Clamp(RozmiarStrony, 1, 100);
    public int Pominij => (Strona - 1) * RozmiarStrony;
}

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];
    public int Strona { get; init; }
    public int RozmiarStrony { get; init; }
    public int LacznaLiczba { get; init; }
    public int LacznaLiczbaStron => (int)Math.Ceiling((double)LacznaLiczba / RozmiarStrony);
    public bool MaPoprzednia => Strona > 1;
    public bool MaNastepna => Strona < LacznaLiczbaStron;

    public static async Task<PagedResult<T>> UtworzAsync(
        IQueryable<T> query, PagedRequest req, CancellationToken ct = default)
    {
        var total = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .CountAsync(query, ct);

        var items = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .ToListAsync(query.Skip(req.Pominij).Take(req.RozmiarStrony), ct);

        return new PagedResult<T>
        {
            Items = items,
            Strona = req.Strona,
            RozmiarStrony = req.RozmiarStrony,
            LacznaLiczba = total
        };
    }
}
