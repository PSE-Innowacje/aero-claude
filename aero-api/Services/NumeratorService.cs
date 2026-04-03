using System.Data;
using System.Data.Common;
using LotyApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace LotyApi.Services;

public interface INumeratorService
{
    /// <summary>
    /// Atomowo rezerwuje i zwraca następny numer operacji.
    /// Musi być wywoływany wewnątrz aktywnej transakcji — numer jest trwały
    /// dopiero po jej zatwierdzeniu (COMMIT).
    /// </summary>
    Task<string> NastepnyNumerOperacjiAsync(CancellationToken ct = default);

    /// <summary>
    /// Atomowo rezerwuje i zwraca następny numer zlecenia.
    /// Musi być wywoływany wewnątrz aktywnej transakcji.
    /// </summary>
    Task<string> NastepnyNumerZleceniaAsync(CancellationToken ct = default);
}

/// <summary>
/// Generuje unikalne numery operacji i zleceń za pomocą atomowego UPSERT
/// na tabeli licznikowej <c>numeratory</c>.
///
/// SQLite gwarantuje atomowość INSERT ... ON CONFLICT DO UPDATE w ramach
/// jednej instrukcji — eliminuje to TOCTOU race condition bez potrzeby
/// SemaphoreSlim. Unique index na kolumnie Numer w tabelach docelowych
/// stanowi dodatkowe zabezpieczenie.
///
/// Używa bezpośredniego ADO.NET (ExecuteScalarAsync) zamiast EF Core SqlQueryRaw,
/// ponieważ INSERT ... RETURNING nie jest composable SQL z perspektywy EF Core.
/// </summary>
public class NumeratorService(LotyDbContext db) : INumeratorService
{
    public async Task<string> NastepnyNumerOperacjiAsync(CancellationToken ct)
    {
        var rok = DateTime.UtcNow.Year;
        var seq = await NastepnaWartoscAsync("OP", rok, ct);
        return $"OP-{rok}-{seq:D4}";
    }

    public async Task<string> NastepnyNumerZleceniaAsync(CancellationToken ct)
    {
        var rok = DateTime.UtcNow.Year;
        var seq = await NastepnaWartoscAsync("ZL", rok, ct);
        return $"ZL-{rok}-{seq:D4}";
    }

    /// <summary>
    /// Atomowy UPSERT — wstawia wiersz z wartością 1 lub inkrementuje istniejący.
    /// RETURNING zwraca nową wartość bezpośrednio z bazy.
    /// Uczestniczy w bieżącej transakcji EF Core (jeśli istnieje).
    /// </summary>
    private async Task<int> NastepnaWartoscAsync(string prefix, int rok, CancellationToken ct)
    {
        var connection = db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(ct);

        await using var cmd = connection.CreateCommand();

        // Podłącz się pod bieżącą transakcję EF Core (OperacjaService / ZlecenieService
        // wywołują NumeratorService wewnątrz BeginTransactionAsync)
        cmd.Transaction = db.Database.CurrentTransaction?.GetDbTransaction();

        cmd.CommandText = """
            INSERT INTO numeratory (prefix, rok, ostatnia_wartosc)
            VALUES ($prefix, $rok, 1)
            ON CONFLICT(prefix, rok) DO UPDATE SET ostatnia_wartosc = ostatnia_wartosc + 1
            RETURNING ostatnia_wartosc;
            """;

        var pPrefix = cmd.CreateParameter();
        pPrefix.ParameterName = "$prefix";
        pPrefix.Value = prefix;
        cmd.Parameters.Add(pPrefix);

        var pRok = cmd.CreateParameter();
        pRok.ParameterName = "$rok";
        pRok.Value = rok;
        cmd.Parameters.Add(pRok);

        var result = await cmd.ExecuteScalarAsync(ct)
            ?? throw new InvalidOperationException(
                $"UPSERT numeratora ({prefix}, {rok}) nie zwrócił wartości.");

        return Convert.ToInt32(result);
    }
}
