using LotyApi.Data;
using LotyApi.Models;
using LotyApi.Services;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Tests.Services;

public class NumeratorServiceTests
{
    private static LotyDbContext CreateContext(string dbName)
    {
        var opts = new DbContextOptionsBuilder<LotyDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new LotyDbContext(opts);
    }

    // ── Operacje ──────────────────────────────────────────────

    [Fact]
    public async Task NastepnyNumerOperacji_WhenNoOperations_ReturnsFirst()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext(nameof(NastepnyNumerOperacji_WhenNoOperations_ReturnsFirst));
        var service = new NumeratorService(db);

        var result = await service.NastepnyNumerOperacjiAsync();

        Assert.Equal($"OP-{rok}-0001", result);
    }

    [Fact]
    public async Task NastepnyNumerOperacji_WithOneExisting_ReturnsSecond()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext(nameof(NastepnyNumerOperacji_WithOneExisting_ReturnsSecond));
        db.PlanowaneOperacje.Add(BuildOperacja($"OP-{rok}-0001"));
        await db.SaveChangesAsync();
        var service = new NumeratorService(db);

        var result = await service.NastepnyNumerOperacjiAsync();

        Assert.Equal($"OP-{rok}-0002", result);
    }

    [Fact]
    public async Task NastepnyNumerOperacji_WithGapInSequence_ReturnsNextAfterMax()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext(nameof(NastepnyNumerOperacji_WithGapInSequence_ReturnsNextAfterMax));
        db.PlanowaneOperacje.AddRange(
            BuildOperacja($"OP-{rok}-0001"),
            BuildOperacja($"OP-{rok}-0005"),
            BuildOperacja($"OP-{rok}-0003")
        );
        await db.SaveChangesAsync();
        var service = new NumeratorService(db);

        var result = await service.NastepnyNumerOperacjiAsync();

        Assert.Equal($"OP-{rok}-0006", result);
    }

    [Fact]
    public async Task NastepnyNumerOperacji_IgnoresOtherYears()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext(nameof(NastepnyNumerOperacji_IgnoresOtherYears));
        // Previous year's operations should not influence current year counter
        db.PlanowaneOperacje.Add(BuildOperacja($"OP-{rok - 1}-0099"));
        await db.SaveChangesAsync();
        var service = new NumeratorService(db);

        var result = await service.NastepnyNumerOperacjiAsync();

        Assert.Equal($"OP-{rok}-0001", result);
    }

    [Fact]
    public async Task NastepnyNumerOperacji_ResultHasFourDigitPaddedSequence()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext(nameof(NastepnyNumerOperacji_ResultHasFourDigitPaddedSequence));
        var service = new NumeratorService(db);

        var result = await service.NastepnyNumerOperacjiAsync();

        // Format must be OP-YYYY-DDDD (4-digit padded sequence)
        Assert.Matches(@$"^OP-{rok}-\d{{4}}$", result);
        Assert.Equal($"OP-{rok}-0001", result);
    }

    // ── Zlecenia ──────────────────────────────────────────────

    [Fact]
    public async Task NastepnyNumerZlecenia_WhenNoOrders_ReturnsFirst()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext(nameof(NastepnyNumerZlecenia_WhenNoOrders_ReturnsFirst));
        var service = new NumeratorService(db);

        var result = await service.NastepnyNumerZleceniaAsync();

        Assert.Equal($"ZL-{rok}-0001", result);
    }

    [Fact]
    public async Task NastepnyNumerZlecenia_WithOneExisting_ReturnsSecond()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext(nameof(NastepnyNumerZlecenia_WithOneExisting_ReturnsSecond));
        db.ZleceniaNaLot.Add(BuildZlecenie($"ZL-{rok}-0001"));
        await db.SaveChangesAsync();
        var service = new NumeratorService(db);

        var result = await service.NastepnyNumerZleceniaAsync();

        Assert.Equal($"ZL-{rok}-0002", result);
    }

    [Fact]
    public async Task NastepnyNumerZlecenia_WithMultipleExisting_ReturnsNextAfterMax()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext(nameof(NastepnyNumerZlecenia_WithMultipleExisting_ReturnsNextAfterMax));
        db.ZleceniaNaLot.AddRange(
            BuildZlecenie($"ZL-{rok}-0001"),
            BuildZlecenie($"ZL-{rok}-0010")
        );
        await db.SaveChangesAsync();
        var service = new NumeratorService(db);

        var result = await service.NastepnyNumerZleceniaAsync();

        Assert.Equal($"ZL-{rok}-0011", result);
    }

    [Fact]
    public async Task NastepnyNumerZlecenia_ResultHasFourDigitPaddedSequence()
    {
        var rok = DateTime.UtcNow.Year;
        using var db = CreateContext(nameof(NastepnyNumerZlecenia_ResultHasFourDigitPaddedSequence));
        var service = new NumeratorService(db);

        var result = await service.NastepnyNumerZleceniaAsync();

        Assert.Matches(@$"^ZL-{rok}-\d{{4}}$", result);
    }

    // ── Helpers ───────────────────────────────────────────────

    private static PlanowanaOperacja BuildOperacja(string numer) => new()
    {
        Numer = numer,
        NumerZleceniaProjektu = "PRJ-001",
        OpisSkrocony = "Test",
        StatusId = 1,
        WprowadzajacyId = 1
    };

    private static ZlecenieNaLot BuildZlecenie(string numer) => new()
    {
        Numer = numer,
        PilotId = 1,
        HelikopterId = 1,
        LadowiskoStartoweId = 1,
        LadowiskoKoncoweId = 2,
        PlanowanyStartDt = DateTime.UtcNow.AddDays(1),
        PlanowaneLadowanieDt = DateTime.UtcNow.AddDays(1).AddHours(2),
        SzacowanaDlugoscTrasy = 100,
        WagaZalogiKg = 150,
        StatusId = 1
    };
}
