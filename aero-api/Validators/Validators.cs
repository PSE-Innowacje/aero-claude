using FluentValidation;
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
            .Matches("[0-9]").WithMessage("Hasło musi zawierać co najmniej jedną cyfrę.");

        RuleFor(x => x.RolaId)
            .GreaterThan(0).WithMessage("Rola jest wymagana.");
    }
}

// ── Helikoptery ───────────────────────────────────────────────

public class UtworzHelikopterValidator : AbstractValidator<UtworzHelikopterDto>
{
    public UtworzHelikopterValidator()
    {
        RuleFor(x => x.NumerRejestracyjny)
            .NotEmpty().WithMessage("Numer rejestracyjny jest wymagany.")
            .MaximumLength(30);

        RuleFor(x => x.Typ)
            .NotEmpty().WithMessage("Typ helikoptera jest wymagany.")
            .MaximumLength(100);

        RuleFor(x => x.Opis)
            .MaximumLength(100).When(x => x.Opis is not null);

        RuleFor(x => x.MaksLiczbaCzlonkowZalogi)
            .InclusiveBetween(1, 10).WithMessage("Maksymalna liczba członków załogi musi być w przedziale 1–10.");

        RuleFor(x => x.MaksUdzwigKg)
            .InclusiveBetween(1, 1000).WithMessage("Maksymalny udźwig musi być w przedziale 1–1000 kg.");

        RuleFor(x => x.ZasiegKm)
            .InclusiveBetween(1, 1000).WithMessage("Zasięg musi być w przedziale 1–1000 km.");

        RuleFor(x => x.Status)
            .Must(s => s is "aktywny" or "nieaktywny")
            .WithMessage("Status musi być 'aktywny' lub 'nieaktywny'.");

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
        RuleFor(x => x.Imie)
            .NotEmpty().MaximumLength(100);

        RuleFor(x => x.Nazwisko)
            .NotEmpty().MaximumLength(100);

        RuleFor(x => x.Email)
            .NotEmpty().MaximumLength(100)
            .EmailAddress().WithMessage("Nieprawidłowy format adresu email.");

        RuleFor(x => x.WagaKg)
            .InclusiveBetween(30, 200).WithMessage("Waga musi być w przedziale 30–200 kg.");

        RuleFor(x => x.RolaId)
            .GreaterThan(0).WithMessage("Rola jest wymagana.");

        // Pola wymagane tylko dla pilota (rola_id = 1 = Pilot w słowniku)
        RuleFor(x => x.NrLicencjiPilota)
            .NotEmpty().WithMessage("Numer licencji pilota jest wymagany.")
            .MaximumLength(30)
            .When(x => x.RolaId == 1);

        RuleFor(x => x.DataWaznosciLicencji)
            .NotNull().WithMessage("Data ważności licencji jest wymagana dla pilota.")
            .When(x => x.RolaId == 1);

        RuleFor(x => x.DataWaznosciSzkolenia)
            .NotEmpty().WithMessage("Data ważności szkolenia jest wymagana.");
    }
}

// ── Lądowiska ─────────────────────────────────────────────────

public class UtworzLadowiskoValidator : AbstractValidator<UtworzLadowiskoDto>
{
    public UtworzLadowiskoValidator()
    {
        RuleFor(x => x.Nazwa)
            .NotEmpty().WithMessage("Nazwa lądowiska jest wymagana.")
            .MaximumLength(200);

        RuleFor(x => x.Szerokosc)
            .InclusiveBetween(-90, 90).WithMessage("Szerokość geograficzna musi być w przedziale -90 do 90.");

        RuleFor(x => x.Dlugosc)
            .InclusiveBetween(-180, 180).WithMessage("Długość geograficzna musi być w przedziale -180 do 180.");
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

// ── Zlecenia na lot ───────────────────────────────────────────

public class UtworzZlecenieValidator : AbstractValidator<UtworzZlecenieDto>
{
    public UtworzZlecenieValidator()
    {
        RuleFor(x => x.PlanowanyStartDt)
            .GreaterThan(DateTime.UtcNow).WithMessage("Data planowanego startu musi być w przyszłości.");

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
