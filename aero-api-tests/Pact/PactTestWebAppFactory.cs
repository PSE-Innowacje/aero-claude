using LotyApi.Data;
using LotyApi.Models;
using LotyApi.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LotyApi.Tests.Pact;

/// <summary>
/// Custom WebApplicationFactory that uses an in-memory SQLite database
/// and seeds the data required by Pact provider states.
/// </summary>
internal class PactTestWebAppFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.UseSetting("Jwt:SecretKey", "PactTestSecretKey_MustBe32CharsLong!!");
        builder.UseSetting("Jwt:Issuer", "LotyApi");
        builder.UseSetting("Jwt:Audience", "LotyApiClients");

        builder.ConfigureServices(services =>
        {
            // Remove existing DbContext registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<LotyDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            // Use in-memory SQLite for tests
            services.AddDbContext<LotyDbContext>(options =>
                options.UseInMemoryDatabase("PactTestDb_" + Guid.NewGuid()));
        });
    }

    public void SeedProviderState(string state)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LotyDbContext>();
        var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();

        db.Database.EnsureCreated();

        // Always seed dictionaries
        SeedDictionaries(db);

        switch (state)
        {
            case "user admin@example.com exists with password Test123!":
                SeedAdminUser(db, authService);
                break;
            case "a valid refresh token exists":
                SeedAdminUser(db, authService);
                SeedRefreshToken(db);
                break;
            case "dictionaries are populated":
                // Already seeded above
                break;
            case "users exist":
            case "user with id 1 exists":
            case "no user with email anna@example.com exists":
                SeedAdminUser(db, authService);
                break;
            case "helicopters exist":
            case "helicopter with id 1 exists":
            case "no helicopter with registration SP-NEW exists":
                SeedAdminUser(db, authService);
                SeedHelikopter(db);
                break;
            case "operations exist":
            case "operation with id 1 exists":
            case "user is authorized to create operations":
            case "operation with id 1 exists in status Wprowadzone":
            case "operation with id 1 has comments":
            case "operation with id 1 has change history":
                SeedAdminUser(db, authService);
                SeedOperacja(db);
                break;
            case "flight orders exist":
            case "flight order with id 1 exists":
            case "prerequisites for creating a flight order exist":
            case "flight order with id 1 exists in status Wprowadzone":
            case "flight order with id 1 has change history":
                SeedAdminUser(db, authService);
                SeedFullScenario(db);
                break;
        }

        db.SaveChanges();
    }

    private static void SeedDictionaries(LotyDbContext db)
    {
        if (db.SlownikRolUzytkownikow.Any()) return;

        db.SlownikRolUzytkownikow.AddRange(
            new SlownikRolUzytkownikow { Id = 1, Nazwa = "Administrator" },
            new SlownikRolUzytkownikow { Id = 2, Nazwa = "Osoba planująca" },
            new SlownikRolUzytkownikow { Id = 3, Nazwa = "Osoba nadzorująca" },
            new SlownikRolUzytkownikow { Id = 4, Nazwa = "Pilot" }
        );

        db.SlownikRolZalogi.AddRange(
            new SlownikRolZalogi { Id = 1, Nazwa = "Pilot" },
            new SlownikRolZalogi { Id = 2, Nazwa = "Mechanik" },
            new SlownikRolZalogi { Id = 3, Nazwa = "Obserwator" }
        );

        db.SlownikRodzajowCzynnosci.AddRange(
            new SlownikRodzajowCzynnosci { Id = 1, Nazwa = "Inspekcja" },
            new SlownikRodzajowCzynnosci { Id = 2, Nazwa = "Transport" },
            new SlownikRodzajowCzynnosci { Id = 3, Nazwa = "Ratownictwo" }
        );

        db.SlownikStatusowOperacji.AddRange(
            new SlownikStatusowOperacji { Id = 1, Nazwa = "Wprowadzone" },
            new SlownikStatusowOperacji { Id = 2, Nazwa = "Odrzucone" },
            new SlownikStatusowOperacji { Id = 3, Nazwa = "Potwierdzone do planowania" },
            new SlownikStatusowOperacji { Id = 4, Nazwa = "Zaplanowane do zlecenia" },
            new SlownikStatusowOperacji { Id = 5, Nazwa = "Częściowo zrealizowane" },
            new SlownikStatusowOperacji { Id = 6, Nazwa = "Zrealizowane" },
            new SlownikStatusowOperacji { Id = 7, Nazwa = "Rezygnacja" }
        );

        db.SlownikStatusowZlecen.AddRange(
            new SlownikStatusowZlecen { Id = 1, Nazwa = "Wprowadzone" },
            new SlownikStatusowZlecen { Id = 2, Nazwa = "Przekazane do akceptacji" },
            new SlownikStatusowZlecen { Id = 3, Nazwa = "Odrzucone" },
            new SlownikStatusowZlecen { Id = 4, Nazwa = "Zaakceptowane" },
            new SlownikStatusowZlecen { Id = 5, Nazwa = "Zrealizowane w części" },
            new SlownikStatusowZlecen { Id = 6, Nazwa = "Zrealizowane w całości" },
            new SlownikStatusowZlecen { Id = 7, Nazwa = "Niezrealizowane" }
        );

        db.SaveChanges();
    }

    private static void SeedAdminUser(LotyDbContext db, IAuthService authService)
    {
        if (db.Uzytkownicy.Any(u => u.Email == "admin@example.com")) return;

        db.Uzytkownicy.Add(new Uzytkownik
        {
            Id = 1,
            Imie = "Jan",
            Nazwisko = "Kowalski",
            Email = "admin@example.com",
            HasloHash = authService.HashPassword("Test123!"),
            RolaId = 1,
            Aktywny = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        db.SaveChanges();
    }

    private static void SeedRefreshToken(LotyDbContext db)
    {
        db.RefreshTokens.Add(new RefreshToken
        {
            Token = "valid_refresh_token",
            UzytkownikId = 1,
            UtworzonoUtc = DateTime.UtcNow,
            WygasaUtc = DateTime.UtcNow.AddDays(7)
        });
        db.SaveChanges();
    }

    private static void SeedHelikopter(LotyDbContext db)
    {
        if (db.Helikoptery.Any()) return;

        db.Helikoptery.Add(new Helikopter
        {
            Id = 1,
            NumerRejestracyjny = "SP-ABC",
            Typ = "Bell 407",
            Opis = "Helikopter ratunkowy",
            MaksLiczbaCzlonkowZalogi = 4,
            MaksUdzwigKg = 1200,
            ZasiegKm = 600,
            Status = "Aktywny",
            DataWaznosciPrzegladu = new DateOnly(2026, 12, 31)
        });
        db.SaveChanges();
    }

    private static void SeedOperacja(LotyDbContext db)
    {
        SeedHelikopter(db);

        if (db.PlanowaneOperacje.Any()) return;

        var operacja = new PlanowanaOperacja
        {
            Id = 1,
            Numer = "OP-2026-001",
            NumerZleceniaProjektu = "ZP-001",
            OpisSkrocony = "Inspekcja terenu",
            KmlNazwaPliku = "trasa.kml",
            KmlZawartosc = "<kml>...</kml>",
            LiczbaKmTrasy = 50,
            ProponowanaDataOd = new DateOnly(2026, 4, 1),
            ProponowanaDataDo = new DateOnly(2026, 4, 5),
            PlanowanaDataOd = new DateOnly(2026, 4, 2),
            PlanowanaDataDo = new DateOnly(2026, 4, 4),
            DodatkoweInfo = "Uwagi dodatkowe",
            StatusId = 1,
            WprowadzajacyId = 1,
            CreatedAt = new DateTime(2026, 3, 30, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = new DateTime(2026, 3, 30, 10, 0, 0, DateTimeKind.Utc)
        };
        db.PlanowaneOperacje.Add(operacja);
        db.SaveChanges();

        db.OperacjeRodzajeCzynnosci.Add(new OperacjaRodzajCzynnosci
        {
            OperacjaId = 1,
            RodzajCzynnosciId = 1
        });

        db.OperacjePunktyTrasy.Add(new OperacjaPunktTrasy
        {
            OperacjaId = 1,
            Kolejnosc = 1,
            Szerokosc = 51.1,
            Dlugosc = 17.0
        });

        db.OperacjeOsobyKontaktowe.Add(new OperacjaOsobaKontaktowa
        {
            OperacjaId = 1,
            UzytkownikId = 1
        });

        db.OperacjeKomentarze.Add(new OperacjaKomentarz
        {
            OperacjaId = 1,
            Tresc = "Komentarz testowy",
            AutorId = 1,
            CreatedAt = new DateTime(2026, 3, 30, 10, 0, 0, DateTimeKind.Utc)
        });

        db.OperacjeHistoriaZmian.Add(new OperacjaHistoriaZmian
        {
            OperacjaId = 1,
            Pole = "Status",
            StaraWartosc = "Wprowadzone",
            NowaWartosc = "Potwierdzone do planowania",
            ZmienionePrzez = 1,
            DataZmiany = new DateTime(2026, 3, 30, 12, 0, 0, DateTimeKind.Utc)
        });

        db.SaveChanges();
    }

    private static void SeedFullScenario(LotyDbContext db)
    {
        SeedOperacja(db);

        // Seed crew members
        if (!db.CzlonkowieZalogi.Any())
        {
            db.CzlonkowieZalogi.AddRange(
                new CzlonekZalogi
                {
                    Id = 1,
                    Imie = "Jan",
                    Nazwisko = "Kowalski",
                    Email = "pilot@example.com",
                    WagaKg = 80,
                    RolaId = 1,
                    NrLicencjiPilota = "PL-12345",
                    DataWaznosciLicencji = new DateOnly(2027, 12, 31),
                    DataWaznosciSzkolenia = new DateOnly(2027, 6, 30),
                    Aktywny = true
                },
                new CzlonekZalogi
                {
                    Id = 2,
                    Imie = "Anna",
                    Nazwisko = "Nowak",
                    Email = "mechanic@example.com",
                    WagaKg = 70,
                    RolaId = 2,
                    DataWaznosciSzkolenia = new DateOnly(2027, 6, 30),
                    Aktywny = true
                }
            );
            db.SaveChanges();
        }

        // Seed landing sites
        if (!db.Ladowiska.Any())
        {
            db.Ladowiska.AddRange(
                new Ladowisko { Id = 1, Nazwa = "Baza Główna", Szerokosc = 51.1, Dlugosc = 17.0 },
                new Ladowisko { Id = 2, Nazwa = "Punkt B", Szerokosc = 51.2, Dlugosc = 17.1 }
            );
            db.SaveChanges();
        }

        // Set operation to status 4 (Zaplanowane do zlecenia) for order creation
        var op = db.PlanowaneOperacje.Find(1);
        if (op != null) op.StatusId = 4;
        db.SaveChanges();

        // Seed flight order
        if (!db.ZleceniaNaLot.Any())
        {
            db.ZleceniaNaLot.Add(new ZlecenieNaLot
            {
                Id = 1,
                Numer = "ZL-2026-001",
                PlanowanyStartDt = new DateTime(2026, 4, 10, 8, 0, 0, DateTimeKind.Utc),
                PlanowaneLadowanieDt = new DateTime(2026, 4, 10, 12, 0, 0, DateTimeKind.Utc),
                PilotId = 1,
                HelikopterId = 1,
                LadowiskoStartoweId = 1,
                LadowiskoKoncoweId = 2,
                SzacowanaDlugoscTrasy = 120,
                WagaZalogiKg = 320,
                StatusId = 1,
                TworzacyId = 1,
                CreatedAt = new DateTime(2026, 3, 30, 10, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 3, 30, 10, 0, 0, DateTimeKind.Utc)
            });
            db.SaveChanges();

            db.ZlecieniaCzlonkowieZalogi.AddRange(
                new ZlecienieCzlonekZalogi { ZlecenieId = 1, CzlonekId = 1 },
                new ZlecienieCzlonekZalogi { ZlecenieId = 1, CzlonekId = 2 }
            );

            db.ZlecenieOperacje.Add(new ZlecenieOperacja { ZlecenieId = 1, OperacjaId = 1 });

            db.ZlecenieHistoriaZmian.Add(new ZlecenieHistoriaZmian
            {
                ZlecenieId = 1,
                Pole = "Status",
                StaraWartosc = "Wprowadzone",
                NowaWartosc = "Przekazane do akceptacji",
                ZmienionePrzez = 1,
                DataZmiany = new DateTime(2026, 3, 30, 14, 0, 0, DateTimeKind.Utc)
            });

            db.SaveChanges();
        }
    }
}
