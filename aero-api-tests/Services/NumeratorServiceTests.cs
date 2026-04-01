using LotyApi.Data;
using LotyApi.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Tests.Services;

/// <summary>
/// Testy NumeratorService wymagają SQLite (nie InMemory), ponieważ serwis
/// używa raw SQL (INSERT ... ON CONFLICT ... RETURNING).
/// </summary>
public class NumeratorServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;

    public NumeratorServiceTests()
    {
        // Shared in-memory SQLite — żyje dopóki connection jest otwarte
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    private LotyDbContext CreateContext()
    {
        var opts = new DbContextOptionsBuilder<LotyDbContext>()
            .UseSqlite(_connection)
            .Options;
        var ctx = new LotyDbContext(opts);
        ctx.Database.EnsureCreated();

        // Tabela numeratory nie jest częścią modelu EF (tworzona ręcznie w Program.cs)
        ctx.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS numeratory (
                prefix TEXT NOT NULL,
                rok    INTEGER NOT NULL,
                ostatnia_wartosc INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (prefix, rok)
            );
            """);

        return ctx;
    }

    // ── Operacje ──────────────────────────────────────────────

    [Fact]
    public async Task NastepnyNumerOperacji_WhenNoOperations_ReturnsFirst()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext();
        INumeratorService service = new NumeratorService(db);

        var result = await service.NastepnyNumerOperacjiAsync();

        Assert.Equal($"OP-{rok}-0001", result);
    }

    [Fact]
    public async Task NastepnyNumerOperacji_CalledTwice_ReturnsSequential()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext();
        INumeratorService service = new NumeratorService(db);

        var first = await service.NastepnyNumerOperacjiAsync();
        var second = await service.NastepnyNumerOperacjiAsync();

        Assert.Equal($"OP-{rok}-0001", first);
        Assert.Equal($"OP-{rok}-0002", second);
    }

    [Fact]
    public async Task NastepnyNumerOperacji_WithExistingCounter_ContinuesSequence()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext();

        // Symulacja istniejącego stanu numeratora (np. po synchronizacji z danymi)
        db.Database.ExecuteSqlRaw(
            "INSERT INTO numeratory (prefix, rok, ostatnia_wartosc) VALUES ('OP', {0}, 5)", rok);

        INumeratorService service = new NumeratorService(db);

        var result = await service.NastepnyNumerOperacjiAsync();

        Assert.Equal($"OP-{rok}-0006", result);
    }

    [Fact]
    public async Task NastepnyNumerOperacji_ResultHasFourDigitPaddedSequence()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext();
        INumeratorService service = new NumeratorService(db);

        var result = await service.NastepnyNumerOperacjiAsync();

        Assert.Matches(@$"^OP-{rok}-\d{{4}}$", result);
    }

    // ── Zlecenia ──────────────────────────────────────────────

    [Fact]
    public async Task NastepnyNumerZlecenia_WhenNoOrders_ReturnsFirst()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext();
        INumeratorService service = new NumeratorService(db);

        var result = await service.NastepnyNumerZleceniaAsync();

        Assert.Equal($"ZL-{rok}-0001", result);
    }

    [Fact]
    public async Task NastepnyNumerZlecenia_CalledTwice_ReturnsSequential()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext();
        INumeratorService service = new NumeratorService(db);

        var first = await service.NastepnyNumerZleceniaAsync();
        var second = await service.NastepnyNumerZleceniaAsync();

        Assert.Equal($"ZL-{rok}-0001", first);
        Assert.Equal($"ZL-{rok}-0002", second);
    }

    [Fact]
    public async Task NastepnyNumerZlecenia_WithExistingCounter_ContinuesSequence()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext();
        db.Database.ExecuteSqlRaw(
            "INSERT INTO numeratory (prefix, rok, ostatnia_wartosc) VALUES ('ZL', {0}, 10)", rok);

        INumeratorService service = new NumeratorService(db);

        var result = await service.NastepnyNumerZleceniaAsync();

        Assert.Equal($"ZL-{rok}-0011", result);
    }

    [Fact]
    public async Task NastepnyNumerZlecenia_ResultHasFourDigitPaddedSequence()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext();
        INumeratorService service = new NumeratorService(db);

        var result = await service.NastepnyNumerZleceniaAsync();

        Assert.Matches(@$"^ZL-{rok}-\d{{4}}$", result);
    }

    // ── Izolacja prefixów ─────────────────────────────────────

    [Fact]
    public async Task Numeratory_AreSeparatePerPrefix()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext();
        INumeratorService service = new NumeratorService(db);

        var op1 = await service.NastepnyNumerOperacjiAsync();
        var zl1 = await service.NastepnyNumerZleceniaAsync();
        var op2 = await service.NastepnyNumerOperacjiAsync();

        Assert.Equal($"OP-{rok}-0001", op1);
        Assert.Equal($"ZL-{rok}-0001", zl1);
        Assert.Equal($"OP-{rok}-0002", op2);
    }
}
