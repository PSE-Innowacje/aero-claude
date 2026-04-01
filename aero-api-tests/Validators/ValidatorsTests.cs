using FluentValidation.TestHelper;
using LotyApi.DTOs;
using LotyApi.Validators;

namespace LotyApi.Tests.Validators;

// ── LoginValidator ─────────────────────────────────────────────

public class LoginValidatorTests
{
    private readonly LoginValidator _validator = new();

    [Fact]
    public void ValidLogin_ShouldPass()
    {
        var result = _validator.TestValidate(new LoginDto("user@example.com", "secret123"));
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void EmptyEmail_ShouldFail()
    {
        var result = _validator.TestValidate(new LoginDto("", "secret123"));
        result.ShouldHaveValidationErrorFor(x => x.Email)
              .WithErrorMessage("Email jest wymagany.");
    }

    [Theory]
    [InlineData("notanemail")]
    [InlineData("missing@")]
    [InlineData("@domain.com")]
    public void InvalidEmailFormat_ShouldFail(string email)
    {
        var result = _validator.TestValidate(new LoginDto(email, "secret123"));
        result.ShouldHaveValidationErrorFor(x => x.Email)
              .WithErrorMessage("Nieprawidłowy format adresu email.");
    }

    [Fact]
    public void EmptyPassword_ShouldFail()
    {
        var result = _validator.TestValidate(new LoginDto("user@example.com", ""));
        result.ShouldHaveValidationErrorFor(x => x.Haslo)
              .WithErrorMessage("Hasło jest wymagane.");
    }
}

// ── RefreshTokenValidator ──────────────────────────────────────

public class RefreshTokenValidatorTests
{
    private readonly RefreshTokenValidator _validator = new();

    [Fact]
    public void ValidToken_ShouldPass()
    {
        var result = _validator.TestValidate(new RefreshTokenDto("sometoken123"));
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void EmptyToken_ShouldFail()
    {
        var result = _validator.TestValidate(new RefreshTokenDto(""));
        result.ShouldHaveValidationErrorFor(x => x.RefreshToken)
              .WithErrorMessage("Refresh token jest wymagany.");
    }
}

// ── UtworzUzytkownikaValidator ────────────────────────────────

public class UtworzUzytkownikaValidatorTests
{
    private readonly UtworzUzytkownikaValidator _validator = new();

    private static UtworzUzytkownikaDto ValidDto() =>
        new("Jan", "Kowalski", "jan@example.com", "Haslo1@abcde", 1);

    [Fact]
    public void ValidDto_ShouldPass()
    {
        var result = _validator.TestValidate(ValidDto());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void EmptyImie_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { Imie = "" });
        result.ShouldHaveValidationErrorFor(x => x.Imie);
    }

    [Fact]
    public void ImieTooLong_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { Imie = new string('A', 101) });
        result.ShouldHaveValidationErrorFor(x => x.Imie);
    }

    [Fact]
    public void EmptyNazwisko_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { Nazwisko = "" });
        result.ShouldHaveValidationErrorFor(x => x.Nazwisko);
    }

    [Fact]
    public void InvalidEmail_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { Email = "notvalid" });
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Theory]
    [InlineData("short1@")]         // < 8 chars
    [InlineData("alllowercase1@")]  // no uppercase
    [InlineData("ALLUPPERCASE1@")]  // no lowercase
    [InlineData("NoDigitsHere@")]   // no digit
    [InlineData("NoSpecial1Abc")]   // no special char
    public void WeakPassword_ShouldFail(string password)
    {
        var result = _validator.TestValidate(ValidDto() with { Haslo = password });
        result.ShouldHaveValidationErrorFor(x => x.Haslo);
    }

    [Fact]
    public void RolaIdZero_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { RolaId = 0 });
        result.ShouldHaveValidationErrorFor(x => x.RolaId)
              .WithErrorMessage("Rola jest wymagana.");
    }
}

// ── AktualizujUzytkownikaValidator ───────────────────────────

public class AktualizujUzytkownikaValidatorTests
{
    private readonly AktualizujUzytkownikaValidator _validator = new();

    private static AktualizujUzytkownikaDto ValidDto() =>
        new("Jan", "Kowalski", "jan@example.com", 1, true);

    [Fact]
    public void ValidDto_ShouldPass()
    {
        var result = _validator.TestValidate(ValidDto());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void EmptyEmail_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { Email = "" });
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void InvalidRolaId_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { RolaId = 0 });
        result.ShouldHaveValidationErrorFor(x => x.RolaId);
    }
}

// ── UtworzHelikopterValidator ─────────────────────────────────

public class UtworzHelikopterValidatorTests
{
    private readonly UtworzHelikopterValidator _validator = new();

    private static UtworzHelikopterDto ValidAktywny() =>
        new("SP-ABC", "Robinson R44", null, 2, 400, 200, "aktywny",
            DateOnly.FromDateTime(DateTime.Today.AddMonths(6)));

    private static UtworzHelikopterDto ValidNieaktywny() =>
        new("SP-XYZ", "Bell 206", null, 2, 400, 200, "nieaktywny", null);

    [Fact]
    public void ValidAktywny_ShouldPass()
    {
        var result = _validator.TestValidate(ValidAktywny());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void ValidNieaktywny_WithoutInspectionDate_ShouldPass()
    {
        var result = _validator.TestValidate(ValidNieaktywny());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void EmptyNumerRejestracyjny_ShouldFail()
    {
        var result = _validator.TestValidate(ValidAktywny() with { NumerRejestracyjny = "" });
        result.ShouldHaveValidationErrorFor(x => x.NumerRejestracyjny);
    }

    [Fact]
    public void NumerRejestracyjnyTooLong_ShouldFail()
    {
        var result = _validator.TestValidate(ValidAktywny() with { NumerRejestracyjny = new string('X', 31) });
        result.ShouldHaveValidationErrorFor(x => x.NumerRejestracyjny);
    }

    [Fact]
    public void EmptyTyp_ShouldFail()
    {
        var result = _validator.TestValidate(ValidAktywny() with { Typ = "" });
        result.ShouldHaveValidationErrorFor(x => x.Typ);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(11)]
    public void MaksLiczbaCzlonkowZalogi_OutOfRange_ShouldFail(int value)
    {
        var result = _validator.TestValidate(ValidAktywny() with { MaksLiczbaCzlonkowZalogi = value });
        result.ShouldHaveValidationErrorFor(x => x.MaksLiczbaCzlonkowZalogi)
              .WithErrorMessage("Maksymalna liczba członków załogi musi być w przedziale 1–10.");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1001)]
    public void MaksUdzwigKg_OutOfRange_ShouldFail(int value)
    {
        var result = _validator.TestValidate(ValidAktywny() with { MaksUdzwigKg = value });
        result.ShouldHaveValidationErrorFor(x => x.MaksUdzwigKg)
              .WithErrorMessage("Maksymalny udźwig musi być w przedziale 1–1000 kg.");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1001)]
    public void ZasiegKm_OutOfRange_ShouldFail(int value)
    {
        var result = _validator.TestValidate(ValidAktywny() with { ZasiegKm = value });
        result.ShouldHaveValidationErrorFor(x => x.ZasiegKm)
              .WithErrorMessage("Zasięg musi być w przedziale 1–1000 km.");
    }

    [Fact]
    public void InvalidStatus_ShouldFail()
    {
        var result = _validator.TestValidate(ValidAktywny() with { Status = "unknown" });
        result.ShouldHaveValidationErrorFor(x => x.Status)
              .WithErrorMessage("Status musi być 'aktywny' lub 'nieaktywny'.");
    }

    [Fact]
    public void AktywnyWithoutInspectionDate_ShouldFail()
    {
        var dto = ValidAktywny() with { DataWaznosciPrzegladu = null };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.DataWaznosciPrzegladu)
              .WithErrorMessage("Data ważności przeglądu jest wymagana dla statusu 'aktywny'.");
    }
}

// ── UtworzCzlonkaZalogiValidator ──────────────────────────────

public class UtworzCzlonkaZalogiValidatorTests
{
    private readonly UtworzCzlonkaZalogiValidator _validator = new();

    private static UtworzCzlonkaZalogiDto ValidPilot() =>
        new("Anna", "Nowak", "anna@example.com", 70, 1, "LIC-001",
            DateOnly.FromDateTime(DateTime.Today.AddYears(1)),
            DateOnly.FromDateTime(DateTime.Today.AddYears(1)));

    private static UtworzCzlonkaZalogiDto ValidNiePilot() =>
        new("Piotr", "Zielony", "piotr@example.com", 80, 2, null, null,
            DateOnly.FromDateTime(DateTime.Today.AddYears(1)));

    [Fact]
    public void ValidPilot_ShouldPass()
    {
        var result = _validator.TestValidate(ValidPilot());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void ValidNiePilot_ShouldPass()
    {
        var result = _validator.TestValidate(ValidNiePilot());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void PilotWithoutLicenseNumber_ShouldFail()
    {
        var dto = ValidPilot() with { NrLicencjiPilota = null };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.NrLicencjiPilota)
              .WithErrorMessage("Numer licencji pilota jest wymagany.");
    }

    [Fact]
    public void PilotWithoutLicenseDate_ShouldFail()
    {
        var dto = ValidPilot() with { DataWaznosciLicencji = null };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.DataWaznosciLicencji)
              .WithErrorMessage("Data ważności licencji jest wymagana dla pilota.");
    }

    [Fact]
    public void NiePilot_LicenseNotRequired_ShouldPass()
    {
        var result = _validator.TestValidate(ValidNiePilot());
        result.ShouldNotHaveValidationErrorFor(x => x.NrLicencjiPilota);
    }

    [Theory]
    [InlineData(29)]
    [InlineData(201)]
    public void WagaOutOfRange_ShouldFail(int waga)
    {
        var result = _validator.TestValidate(ValidPilot() with { WagaKg = waga });
        result.ShouldHaveValidationErrorFor(x => x.WagaKg)
              .WithErrorMessage("Waga musi być w przedziale 30–200 kg.");
    }

    [Fact]
    public void InvalidEmail_ShouldFail()
    {
        var result = _validator.TestValidate(ValidPilot() with { Email = "notvalid" });
        result.ShouldHaveValidationErrorFor(x => x.Email)
              .WithErrorMessage("Nieprawidłowy format adresu email.");
    }

    [Fact]
    public void RolaIdZero_ShouldFail()
    {
        var result = _validator.TestValidate(ValidNiePilot() with { RolaId = 0 });
        result.ShouldHaveValidationErrorFor(x => x.RolaId);
    }
}

// ── UtworzLadowiskoValidator ──────────────────────────────────

public class UtworzLadowiskoValidatorTests
{
    private readonly UtworzLadowiskoValidator _validator = new();

    private static UtworzLadowiskoDto ValidDto() =>
        new("Lotnisko Główne", 52.23, 21.01, null);

    [Fact]
    public void ValidDto_ShouldPass()
    {
        var result = _validator.TestValidate(ValidDto());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void EmptyNazwa_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { Nazwa = "" });
        result.ShouldHaveValidationErrorFor(x => x.Nazwa)
              .WithErrorMessage("Nazwa lądowiska jest wymagana.");
    }

    [Fact]
    public void NazwaTooLong_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { Nazwa = new string('X', 201) });
        result.ShouldHaveValidationErrorFor(x => x.Nazwa);
    }

    [Theory]
    [InlineData(-91.0)]
    [InlineData(91.0)]
    public void SzerokoscOutOfRange_ShouldFail(double szerokosc)
    {
        var result = _validator.TestValidate(ValidDto() with { Szerokosc = szerokosc });
        result.ShouldHaveValidationErrorFor(x => x.Szerokosc)
              .WithErrorMessage("Szerokość geograficzna musi być w przedziale -90 do 90.");
    }

    [Theory]
    [InlineData(-181.0)]
    [InlineData(181.0)]
    public void DlugoscOutOfRange_ShouldFail(double dlugosc)
    {
        var result = _validator.TestValidate(ValidDto() with { Dlugosc = dlugosc });
        result.ShouldHaveValidationErrorFor(x => x.Dlugosc)
              .WithErrorMessage("Długość geograficzna musi być w przedziale -180 do 180.");
    }

    [Theory]
    [InlineData(-90.0)]
    [InlineData(90.0)]
    [InlineData(0.0)]
    public void SzerokoscBoundaryValues_ShouldPass(double szerokosc)
    {
        var result = _validator.TestValidate(ValidDto() with { Szerokosc = szerokosc });
        result.ShouldNotHaveValidationErrorFor(x => x.Szerokosc);
    }

    [Theory]
    [InlineData(-180.0)]
    [InlineData(180.0)]
    public void DlugoscBoundaryValues_ShouldPass(double dlugosc)
    {
        var result = _validator.TestValidate(ValidDto() with { Dlugosc = dlugosc });
        result.ShouldNotHaveValidationErrorFor(x => x.Dlugosc);
    }
}

// ── UtworzOperacjeValidator ───────────────────────────────────

public class UtworzOperacjeValidatorTests
{
    private readonly UtworzOperacjeValidator _validator = new();

    private static UtworzOperacjeDto ValidDto() =>
        new(
            "PRJ-2026-001",
            "Pomiar trasy wschodniej",
            null, null,
            150,
            DateOnly.FromDateTime(DateTime.Today.AddDays(10)),
            DateOnly.FromDateTime(DateTime.Today.AddDays(20)),
            null,
            [1, 2],
            [new PunktTrasyDto(1, 52.0, 21.0)],
            []);

    [Fact]
    public void ValidDto_ShouldPass()
    {
        var result = _validator.TestValidate(ValidDto());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void EmptyNumerZleceniaProjektu_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { NumerZleceniaProjektu = "" });
        result.ShouldHaveValidationErrorFor(x => x.NumerZleceniaProjektu)
              .WithErrorMessage("Numer zlecenia/projektu jest wymagany.");
    }

    [Fact]
    public void EmptyOpisSkrocony_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { OpisSkrocony = "" });
        result.ShouldHaveValidationErrorFor(x => x.OpisSkrocony)
              .WithErrorMessage("Opis skrócony jest wymagany.");
    }

    [Fact]
    public void LiczbaKmTrasyZero_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { LiczbaKmTrasy = 0 });
        result.ShouldHaveValidationErrorFor(x => x.LiczbaKmTrasy)
              .WithErrorMessage("Liczba km trasy musi być większa od 0.");
    }

    [Fact]
    public void EmptyRodzajeCzynnosci_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { RodzajeCzynnosciIds = [] });
        result.ShouldHaveValidationErrorFor(x => x.RodzajeCzynnosciIds)
              .WithErrorMessage("Należy wybrać co najmniej jeden rodzaj czynności.");
    }

    [Fact]
    public void ProponowanaDataOdAfterDo_ShouldFail()
    {
        var dto = ValidDto() with
        {
            ProponowanaDataOd = DateOnly.FromDateTime(DateTime.Today.AddDays(20)),
            ProponowanaDataDo = DateOnly.FromDateTime(DateTime.Today.AddDays(10))
        };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.ProponowanaDataOd)
              .WithErrorMessage("Proponowana data 'od' nie może być późniejsza niż data 'do'.");
    }

    [Fact]
    public void ProponowaneDatesEqual_ShouldPass()
    {
        var date = DateOnly.FromDateTime(DateTime.Today.AddDays(10));
        var dto = ValidDto() with { ProponowanaDataOd = date, ProponowanaDataDo = date };
        var result = _validator.TestValidate(dto);
        result.ShouldNotHaveValidationErrorFor(x => x.ProponowanaDataOd);
    }

    [Fact]
    public void PunktTrasy_InvalidLatitude_ShouldFail()
    {
        var dto = ValidDto() with
        {
            PunktyTrasy = [new PunktTrasyDto(1, 95.0, 21.0)]
        };
        var result = _validator.TestValidate(dto);
        Assert.True(result.Errors.Count > 0);
    }

    [Fact]
    public void PunktTrasy_InvalidLongitude_ShouldFail()
    {
        var dto = ValidDto() with
        {
            PunktyTrasy = [new PunktTrasyDto(1, 52.0, 200.0)]
        };
        var result = _validator.TestValidate(dto);
        Assert.True(result.Errors.Count > 0);
    }
}

// ── UtworzZlecenieValidator ───────────────────────────────────

public class UtworzZlecenieValidatorTests
{
    private readonly UtworzZlecenieValidator _validator = new();

    private static UtworzZlecenieDto ValidDto() =>
        new(
            DateTime.UtcNow.AddHours(2),
            DateTime.UtcNow.AddHours(4),
            1,
            1,
            2,
            100,
            [],
            [1]);

    [Fact]
    public void ValidDto_ShouldPass()
    {
        var result = _validator.TestValidate(ValidDto());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void StartInThePast_ShouldFail()
    {
        var dto = ValidDto() with { PlanowanyStartDt = DateTime.UtcNow.AddHours(-1) };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.PlanowanyStartDt)
              .WithErrorMessage("Data planowanego startu musi być w przyszłości.");
    }

    [Fact]
    public void LadowanieBeforeStart_ShouldFail()
    {
        var dto = ValidDto() with
        {
            PlanowanyStartDt = DateTime.UtcNow.AddHours(3),
            PlanowaneLadowanieDt = DateTime.UtcNow.AddHours(2)
        };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.PlanowaneLadowanieDt)
              .WithErrorMessage("Data planowanego lądowania musi być późniejsza niż start.");
    }

    [Fact]
    public void HelikopterIdZero_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { HelikopterId = 0 });
        result.ShouldHaveValidationErrorFor(x => x.HelikopterId)
              .WithErrorMessage("Helikopter jest wymagany.");
    }

    [Fact]
    public void LadowiskoStartoweIdZero_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { LadowiskoStartoweId = 0 });
        result.ShouldHaveValidationErrorFor(x => x.LadowiskoStartoweId)
              .WithErrorMessage("Lądowisko startowe jest wymagane.");
    }

    [Fact]
    public void LadowiskoKoncoweIdZero_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { LadowiskoKoncoweId = 0 });
        result.ShouldHaveValidationErrorFor(x => x.LadowiskoKoncoweId)
              .WithErrorMessage("Lądowisko końcowe jest wymagane.");
    }

    [Fact]
    public void EmptyOperacjeIds_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { OperacjeIds = [] });
        result.ShouldHaveValidationErrorFor(x => x.OperacjeIds)
              .WithErrorMessage("Zlecenie musi zawierać co najmniej jedną operację.");
    }

    [Fact]
    public void SzacowanaDlugoscZero_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { SzacowanaDlugoscTrasy = 0 });
        result.ShouldHaveValidationErrorFor(x => x.SzacowanaDlugoscTrasy)
              .WithErrorMessage("Szacowana długość trasy musi być większa od 0.");
    }
}

// ── AktualizujZlecenieValidator ───────────────────────────────

public class AktualizujZlecenieValidatorTests
{
    private readonly AktualizujZlecenieValidator _validator = new();

    private static AktualizujZlecenieDto ValidDto() =>
        new(
            DateTime.UtcNow.AddHours(2),
            DateTime.UtcNow.AddHours(4),
            null, null,
            1, 1, 2,
            100,
            [],
            [1]);

    [Fact]
    public void ValidDto_WithoutActualTimes_ShouldPass()
    {
        var result = _validator.TestValidate(ValidDto());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void ValidDto_WithConsistentActualTimes_ShouldPass()
    {
        var dto = ValidDto() with
        {
            RzeczywistyStartDt = DateTime.UtcNow.AddHours(2),
            RzeczywisteLadowanieDt = DateTime.UtcNow.AddHours(4)
        };
        var result = _validator.TestValidate(dto);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void ActualLadowanieBeforeStart_ShouldFail()
    {
        var dto = ValidDto() with
        {
            RzeczywistyStartDt = DateTime.UtcNow.AddHours(3),
            RzeczywisteLadowanieDt = DateTime.UtcNow.AddHours(2)
        };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.RzeczywisteLadowanieDt)
              .WithErrorMessage("Rzeczywiste lądowanie musi być późniejsze niż start.");
    }

    [Fact]
    public void PlanowaneLadowanieBeforePlanowanyStart_ShouldFail()
    {
        var dto = ValidDto() with
        {
            PlanowanyStartDt = DateTime.UtcNow.AddHours(4),
            PlanowaneLadowanieDt = DateTime.UtcNow.AddHours(2)
        };
        var result = _validator.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.PlanowaneLadowanieDt);
    }

    [Fact]
    public void EmptyOperacjeIds_ShouldFail()
    {
        var result = _validator.TestValidate(ValidDto() with { OperacjeIds = [] });
        result.ShouldHaveValidationErrorFor(x => x.OperacjeIds);
    }
}
