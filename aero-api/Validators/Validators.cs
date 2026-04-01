using FluentValidation;
using LotyApi.Common;
using LotyApi.DTOs;

namespace LotyApi.Validators;

// ── Auth ──────────────────────────────────────────────────────

public class LoginValidator : AbstractValidator<LoginDto>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email jest wymagany.")
            .EmailAddress().WithMessage("Nieprawidłowy format adresu email.");

        RuleFor(x => x.Haslo)
            .NotEmpty().WithMessage("Hasło jest wymagane.");
    }
}

public class RefreshTokenValidator : AbstractValidator<RefreshTokenDto>
{
    public RefreshTokenValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("Refresh token jest wymagany.");
    }
}

// ── Użytkownicy ───────────────────────────────────────────────

public class UtworzUzytkownikaValidator : AbstractValidator<UtworzUzytkownikaDto>
{
    public UtworzUzytkownikaValidator()
    {
        RuleFor(x => x.Imie)
            .NotEmpty().WithMessage("Imię jest wymagane.")
            .MaximumLength(100).WithMessage("Imię może mieć maksymalnie 100 znaków.");

        RuleFor(x => x.Nazwisko)
            .NotEmpty().WithMessage("Nazwisko jest wymagane.")
            .MaximumLength(100).WithMessage("Nazwisko może mieć maksymalnie 100 znaków.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email jest wymagany.")
            .MaximumLength(100)
            .EmailAddress().WithMessage("Nieprawidłowy format adresu email.");

        RuleFor(x => x.Haslo)
            .NotEmpty().WithMessage("Hasło jest wymagane.")
            .MinimumLength(8).WithMessage("Hasło musi mieć co najmniej 8 znaków.")
            .Matches("[A-Z]").WithMessage("Hasło musi zawierać co najmniej jedną wielką literę.")
            .Matches("[a-z]").WithMessage("Hasło musi zawierać co najmniej jedną małą literę.")
            .Matches("[0-9]").WithMessage("Hasło musi zawierać co najmniej jedną cyfrę.")
            .Matches("[^a-zA-Z0-9]").WithMessage("Hasło musi zawierać co najmniej jeden znak specjalny.");

        RuleFor(x => x.RolaId)
            .GreaterThan(0).WithMessage("Rola jest wymagana.");
    }
}

public class AktualizujUzytkownikaValidator : AbstractValidator<AktualizujUzytkownikaDto>
{
    public AktualizujUzytkownikaValidator()
    {
        RuleFor(x => x.Imie)
            .NotEmpty().WithMessage("Imię jest wymagane.")
            .MaximumLength(100).WithMessage("Imię może mieć maksymalnie 100 znaków.");

        RuleFor(x => x.Nazwisko)
            .NotEmpty().WithMessage("Nazwisko jest wymagane.")
            .MaximumLength(100).WithMessage("Nazwisko może mieć maksymalnie 100 znaków.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email jest wymagany.")
            .MaximumLength(100)
            .EmailAddress().WithMessage("Nieprawidłowy format adresu email.");

        RuleFor(x => x.RolaId)
            .GreaterThan(0).WithMessage("Rola jest wymagana.");
    }
}

// ── Helikoptery ───────────────────────────────────────────────

public class UtworzHelikopterValidator : AbstractValidator<UtworzHelikopterDto>
{
    public UtworzHelikopterValidator()
    {
        RuleFor(x => x.NumerRejestracyjny).ApplyHelikopterNumer();
        RuleFor(x => x.Typ).ApplyHelikopterTyp();
        RuleFor(x => x.Opis).ApplyHelikopterOpis();
        RuleFor(x => x.MaksLiczbaCzlonkowZalogi).ApplyHelikopterZaloga();
        RuleFor(x => x.MaksUdzwigKg).ApplyHelikopterUdzwig();
        RuleFor(x => x.ZasiegKm).ApplyHelikopterZasieg();
        RuleFor(x => x.Status).ApplyHelikopterStatus();
        RuleFor(x => x.DataWaznosciPrzegladu)
            .NotNull().WithMessage("Data ważności przeglądu jest wymagana dla statusu 'aktywny'.")
            .When(x => x.Status == "aktywny");
    }
}

public class AktualizujHelikopterValidator : AbstractValidator<AktualizujHelikopterDto>
{
    public AktualizujHelikopterValidator()
    {
        RuleFor(x => x.NumerRejestracyjny).ApplyHelikopterNumer();
        RuleFor(x => x.Typ).ApplyHelikopterTyp();
        RuleFor(x => x.Opis).ApplyHelikopterOpis();
        RuleFor(x => x.MaksLiczbaCzlonkowZalogi).ApplyHelikopterZaloga();
        RuleFor(x => x.MaksUdzwigKg).ApplyHelikopterUdzwig();
        RuleFor(x => x.ZasiegKm).ApplyHelikopterZasieg();
        RuleFor(x => x.Status).ApplyHelikopterStatus();
        RuleFor(x => x.DataWaznosciPrzegladu)
            .NotNull().WithMessage("Data ważności przeglądu jest wymagana dla statusu 'aktywny'.")
            .When(x => x.Status == "aktywny");
    }
}

// ── Członkowie załogi ─────────────────────────────────────────

public class UtworzCzlonkaZalogiValidator : AbstractValidator<UtworzCzlonkaZalogiDto>
{
    public UtworzCzlonkaZalogiValidator()
    {
        RuleFor(x => x.Imie).ApplyCzlonekImie();
        RuleFor(x => x.Nazwisko).ApplyCzlonekNazwisko();
        RuleFor(x => x.Email).ApplyCzlonekEmail();
        RuleFor(x => x.WagaKg).ApplyCzlonekWaga();
        RuleFor(x => x.RolaId).ApplyCzlonekRola();
        RuleFor(x => x.NrLicencjiPilota).ApplyCzlonekLicencja().When(x => x.RolaId == RolaZalogi.Pilot);
        RuleFor(x => x.DataWaznosciLicencji)
            .NotNull().WithMessage("Data ważności licencji jest wymagana dla pilota.")
            .When(x => x.RolaId == RolaZalogi.Pilot);
        RuleFor(x => x.DataWaznosciSzkolenia)
            .NotEmpty().WithMessage("Data ważności szkolenia jest wymagana.");
    }
}

public class AktualizujCzlonkaZalogiValidator : AbstractValidator<AktualizujCzlonkaZalogiDto>
{
    public AktualizujCzlonkaZalogiValidator()
    {
        RuleFor(x => x.Imie).ApplyCzlonekImie();
        RuleFor(x => x.Nazwisko).ApplyCzlonekNazwisko();
        RuleFor(x => x.Email).ApplyCzlonekEmail();
        RuleFor(x => x.WagaKg).ApplyCzlonekWaga();
        RuleFor(x => x.RolaId).ApplyCzlonekRola();
        RuleFor(x => x.NrLicencjiPilota).ApplyCzlonekLicencja().When(x => x.RolaId == RolaZalogi.Pilot);
        RuleFor(x => x.DataWaznosciLicencji)
            .NotNull().WithMessage("Data ważności licencji jest wymagana dla pilota.")
            .When(x => x.RolaId == RolaZalogi.Pilot);
        RuleFor(x => x.DataWaznosciSzkolenia)
            .NotEmpty().WithMessage("Data ważności szkolenia jest wymagana.");
    }
}

// ── Lądowiska ─────────────────────────────────────────────────

public class UtworzLadowiskoValidator : AbstractValidator<UtworzLadowiskoDto>
{
    public UtworzLadowiskoValidator()
    {
        RuleFor(x => x.Nazwa).ApplyLadowiskoNazwa();
        RuleFor(x => x.Szerokosc).ApplySzerokosc();
        RuleFor(x => x.Dlugosc).ApplyDlugosc();
    }
}

public class AktualizujLadowiskoValidator : AbstractValidator<AktualizujLadowiskoDto>
{
    public AktualizujLadowiskoValidator()
    {
        RuleFor(x => x.Nazwa).ApplyLadowiskoNazwa();
        RuleFor(x => x.Szerokosc).ApplySzerokosc();
        RuleFor(x => x.Dlugosc).ApplyDlugosc();
    }
}

// ── Planowane operacje ────────────────────────────────────────

public class UtworzOperacjeValidator : AbstractValidator<UtworzOperacjeDto>
{
    public UtworzOperacjeValidator()
    {
        RuleFor(x => x.NumerZleceniaProjektu)
            .NotEmpty().WithMessage("Numer zlecenia/projektu jest wymagany.")
            .MaximumLength(30);

        RuleFor(x => x.OpisSkrocony)
            .NotEmpty().WithMessage("Opis skrócony jest wymagany.")
            .MaximumLength(100);

        RuleFor(x => x.LiczbaKmTrasy)
            .GreaterThan(0).WithMessage("Liczba km trasy musi być większa od 0.");

        RuleFor(x => x.KmlZawartosc)
            .MaximumLength(500_000).WithMessage("Zawartość KML przekracza maksymalny rozmiar (500 000 znaków).")
            .When(x => x.KmlZawartosc is not null);

        RuleFor(x => x.DodatkoweInfo)
            .MaximumLength(500).When(x => x.DodatkoweInfo is not null);

        RuleFor(x => x.RodzajeCzynnosciIds)
            .NotEmpty().WithMessage("Należy wybrać co najmniej jeden rodzaj czynności.");

        RuleFor(x => x.ProponowanaDataOd)
            .LessThanOrEqualTo(x => x.ProponowanaDataDo)
            .When(x => x.ProponowanaDataOd.HasValue && x.ProponowanaDataDo.HasValue)
            .WithMessage("Proponowana data 'od' nie może być późniejsza niż data 'do'.");

        RuleForEach(x => x.PunktyTrasy).ChildRules(pt =>
        {
            pt.RuleFor(p => p.Szerokosc).InclusiveBetween(-90, 90);
            pt.RuleFor(p => p.Dlugosc).InclusiveBetween(-180, 180);
        });
    }
}

public class AktualizujOperacjeValidator : AbstractValidator<AktualizujOperacjeDto>
{
    public AktualizujOperacjeValidator()
    {
        RuleFor(x => x.NumerZleceniaProjektu)
            .NotEmpty().WithMessage("Numer zlecenia/projektu jest wymagany.")
            .MaximumLength(30);

        RuleFor(x => x.OpisSkrocony)
            .NotEmpty().WithMessage("Opis skrócony jest wymagany.")
            .MaximumLength(100);

        RuleFor(x => x.LiczbaKmTrasy)
            .GreaterThan(0).WithMessage("Liczba km trasy musi być większa od 0.");

        RuleFor(x => x.KmlZawartosc)
            .MaximumLength(500_000).WithMessage("Zawartość KML przekracza maksymalny rozmiar (500 000 znaków).")
            .When(x => x.KmlZawartosc is not null);

        RuleFor(x => x.DodatkoweInfo)
            .MaximumLength(500).When(x => x.DodatkoweInfo is not null);

        RuleFor(x => x.Komentarz)
            .MaximumLength(500).When(x => x.Komentarz is not null);

        RuleFor(x => x.UwagiPoRealizacji)
            .MaximumLength(500).When(x => x.UwagiPoRealizacji is not null);

        RuleFor(x => x.RodzajeCzynnosciIds)
            .NotEmpty().WithMessage("Należy wybrać co najmniej jeden rodzaj czynności.");

        RuleFor(x => x.PlanowanaDataOd)
            .LessThanOrEqualTo(x => x.PlanowanaDataDo)
            .When(x => x.PlanowanaDataOd.HasValue && x.PlanowanaDataDo.HasValue)
            .WithMessage("Planowana data 'od' nie może być późniejsza niż data 'do'.");

        RuleForEach(x => x.PunktyTrasy).ChildRules(pt =>
        {
            pt.RuleFor(p => p.Szerokosc).InclusiveBetween(-90, 90);
            pt.RuleFor(p => p.Dlugosc).InclusiveBetween(-180, 180);
        });
    }
}

// ── Zmiana statusu ────────────────────────────────────────────

public class ZmienStatusOperacjiValidator : AbstractValidator<ZmienStatusOperacjiDto>
{
    public ZmienStatusOperacjiValidator()
    {
        RuleFor(x => x.StatusId)
            .InclusiveBetween(StatusOperacji.Wprowadzone, StatusOperacji.Rezygnacja)
            .WithMessage("Nieprawidłowy status operacji.");

        RuleFor(x => x.Komentarz)
            .MaximumLength(500).When(x => x.Komentarz is not null);
    }
}

public class ZmienStatusZlecenieValidator : AbstractValidator<ZmienStatusZlecenieDto>
{
    public ZmienStatusZlecenieValidator()
    {
        RuleFor(x => x.StatusId)
            .InclusiveBetween(StatusZlecenia.Wprowadzone, StatusZlecenia.NieZrealizowane)
            .WithMessage("Nieprawidłowy status zlecenia.");
    }
}

// ── Zlecenia na lot ───────────────────────────────────────────

public class UtworzZlecenieValidator : AbstractValidator<UtworzZlecenieDto>
{
    public UtworzZlecenieValidator()
    {
        RuleFor(x => x.PlanowanyStartDt)
            .Must(dt => dt > DateTime.UtcNow)
            .WithMessage("Data planowanego startu musi być w przyszłości.");

        RuleFor(x => x.PlanowaneLadowanieDt)
            .GreaterThan(x => x.PlanowanyStartDt)
            .WithMessage("Data planowanego lądowania musi być późniejsza niż start.");

        RuleFor(x => x.HelikopterId)
            .GreaterThan(0).WithMessage("Helikopter jest wymagany.");

        RuleFor(x => x.LadowiskoStartoweId)
            .GreaterThan(0).WithMessage("Lądowisko startowe jest wymagane.");

        RuleFor(x => x.LadowiskoKoncoweId)
            .GreaterThan(0).WithMessage("Lądowisko końcowe jest wymagane.");

        RuleFor(x => x.SzacowanaDlugoscTrasy)
            .GreaterThan(0).WithMessage("Szacowana długość trasy musi być większa od 0.");

        RuleFor(x => x.OperacjeIds)
            .NotEmpty().WithMessage("Zlecenie musi zawierać co najmniej jedną operację.");
    }
}

public class AktualizujZlecenieValidator : AbstractValidator<AktualizujZlecenieDto>
{
    public AktualizujZlecenieValidator()
    {
        RuleFor(x => x.PlanowanyStartDt)
            .NotEmpty().WithMessage("Data planowanego startu jest wymagana.");

        RuleFor(x => x.PlanowaneLadowanieDt)
            .GreaterThan(x => x.PlanowanyStartDt)
            .WithMessage("Data planowanego lądowania musi być późniejsza niż start.");

        RuleFor(x => x.HelikopterId)
            .GreaterThan(0).WithMessage("Helikopter jest wymagany.");

        RuleFor(x => x.LadowiskoStartoweId)
            .GreaterThan(0).WithMessage("Lądowisko startowe jest wymagane.");

        RuleFor(x => x.LadowiskoKoncoweId)
            .GreaterThan(0).WithMessage("Lądowisko końcowe jest wymagane.");

        RuleFor(x => x.SzacowanaDlugoscTrasy)
            .GreaterThan(0).WithMessage("Szacowana długość trasy musi być większa od 0.");

        RuleFor(x => x.OperacjeIds)
            .NotEmpty().WithMessage("Zlecenie musi zawierać co najmniej jedną operację.");

        // Jeśli podano rzeczywiste czasy — muszą być spójne
        RuleFor(x => x.RzeczywisteLadowanieDt)
            .GreaterThan(x => x.RzeczywistyStartDt)
            .When(x => x.RzeczywistyStartDt.HasValue && x.RzeczywisteLadowanieDt.HasValue)
            .WithMessage("Rzeczywiste lądowanie musi być późniejsze niż start.");
    }
}

// ── Wspólne reguły walidacji (extension methods) ─────────────

public static class ValidatorExtensions
{
    // Helikoptery
    public static IRuleBuilderOptions<T, string> ApplyHelikopterNumer<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Numer rejestracyjny jest wymagany.").MaximumLength(30);

    public static IRuleBuilderOptions<T, string> ApplyHelikopterTyp<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Typ helikoptera jest wymagany.").MaximumLength(100);

    public static IRuleBuilderOptions<T, string?> ApplyHelikopterOpis<T>(this IRuleBuilder<T, string?> rule) =>
        rule.MaximumLength(100);

    public static IRuleBuilderOptions<T, int> ApplyHelikopterZaloga<T>(this IRuleBuilder<T, int> rule) =>
        rule.InclusiveBetween(1, 10).WithMessage("Maksymalna liczba członków załogi musi być w przedziale 1–10.");

    public static IRuleBuilderOptions<T, int> ApplyHelikopterUdzwig<T>(this IRuleBuilder<T, int> rule) =>
        rule.InclusiveBetween(1, 1000).WithMessage("Maksymalny udźwig musi być w przedziale 1–1000 kg.");

    public static IRuleBuilderOptions<T, int> ApplyHelikopterZasieg<T>(this IRuleBuilder<T, int> rule) =>
        rule.InclusiveBetween(1, 1000).WithMessage("Zasięg musi być w przedziale 1–1000 km.");

    public static IRuleBuilderOptions<T, string> ApplyHelikopterStatus<T>(this IRuleBuilder<T, string> rule) =>
        rule.Must(s => s is "aktywny" or "nieaktywny").WithMessage("Status musi być 'aktywny' lub 'nieaktywny'.");

    // Członkowie załogi
    public static IRuleBuilderOptions<T, string> ApplyCzlonekImie<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().MaximumLength(100);

    public static IRuleBuilderOptions<T, string> ApplyCzlonekNazwisko<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().MaximumLength(100);

    public static IRuleBuilderOptions<T, string> ApplyCzlonekEmail<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().MaximumLength(100).EmailAddress().WithMessage("Nieprawidłowy format adresu email.");

    public static IRuleBuilderOptions<T, int> ApplyCzlonekWaga<T>(this IRuleBuilder<T, int> rule) =>
        rule.InclusiveBetween(30, 200).WithMessage("Waga musi być w przedziale 30–200 kg.");

    public static IRuleBuilderOptions<T, int> ApplyCzlonekRola<T>(this IRuleBuilder<T, int> rule) =>
        rule.GreaterThan(0).WithMessage("Rola jest wymagana.");

    public static IRuleBuilderOptions<T, string?> ApplyCzlonekLicencja<T>(this IRuleBuilder<T, string?> rule) =>
        rule.NotEmpty().WithMessage("Numer licencji pilota jest wymagany.").MaximumLength(30);

    // Lądowiska
    public static IRuleBuilderOptions<T, string> ApplyLadowiskoNazwa<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Nazwa lądowiska jest wymagana.").MaximumLength(200);

    public static IRuleBuilderOptions<T, double> ApplySzerokosc<T>(this IRuleBuilder<T, double> rule) =>
        rule.InclusiveBetween(-90, 90).WithMessage("Szerokość geograficzna musi być w przedziale -90 do 90.");

    public static IRuleBuilderOptions<T, double> ApplyDlugosc<T>(this IRuleBuilder<T, double> rule) =>
        rule.InclusiveBetween(-180, 180).WithMessage("Długość geograficzna musi być w przedziale -180 do 180.");
}
