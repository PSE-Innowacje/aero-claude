using System.ComponentModel.DataAnnotations;

namespace LotyApi.DTOs;

// ── Słowniki ─────────────────────────────────────────────────

public record SlownikDto(int Id, string Nazwa);

// ── Stronicowanie ─────────────────────────────────────────────

public record OperacjeQuery(
    int? StatusId = null,
    string? NumerZlecenia = null,
    DateOnly? PlanowanaOd = null,
    DateOnly? PlanowanaDo = null,
    int Strona = 1,
    int RozmiarStrony = 20);

public record ZleceniaQuery(
    int? StatusId = null,
    int? PilotId = null,
    int? HelikopterId = null,
    DateTime? StartOd = null,
    DateTime? StartDo = null,
    int Strona = 1,
    int RozmiarStrony = 20);

// ── Użytkownicy ───────────────────────────────────────────────

public record UzytkownikDto(int Id, string Imie, string Nazwisko, string Email, int RolaId, string RolaNazwa, bool Aktywny);

public record UtworzUzytkownikaDto(
    [Required] string Imie,
    [Required] string Nazwisko,
    [Required][EmailAddress] string Email,
    [Required] string Haslo,
    [Required] int RolaId);

public record AktualizujUzytkownikaDto(
    [Required] string Imie,
    [Required] string Nazwisko,
    [Required][EmailAddress] string Email,
    [Required] int RolaId,
    bool Aktywny);

// ── Logowanie ─────────────────────────────────────────────────

public record LoginDto([Required][EmailAddress] string Email, [Required] string Haslo);
public record LoginResponseDto(string Token, UzytkownikDto Uzytkownik);

// ── Helikoptery ───────────────────────────────────────────────

public record HelikopterDto(
    int Id, string NumerRejestracyjny, string Typ, string? Opis,
    int MaksLiczbaCzlonkowZalogi, int MaksUdzwigKg, int ZasiegKm,
    string Status, DateOnly? DataWaznosciPrzegladu);

public record UtworzHelikopterDto(
    [Required][MaxLength(30)] string NumerRejestracyjny,
    [Required][MaxLength(100)] string Typ,
    [MaxLength(100)] string? Opis,
    int MaksLiczbaCzlonkowZalogi,
    int MaksUdzwigKg,
    int ZasiegKm,
    [Required] string Status,
    DateOnly? DataWaznosciPrzegladu);

public record AktualizujHelikopterDto(
    [Required][MaxLength(30)] string NumerRejestracyjny,
    [Required][MaxLength(100)] string Typ,
    [MaxLength(100)] string? Opis,
    int MaksLiczbaCzlonkowZalogi,
    int MaksUdzwigKg,
    int ZasiegKm,
    [Required] string Status,
    DateOnly? DataWaznosciPrzegladu);

// ── Członkowie załogi ─────────────────────────────────────────

public record CzlonekZalogiDto(
    int Id, string Imie, string Nazwisko, string Email, int WagaKg,
    int RolaId, string RolaNazwa, string? NrLicencjiPilota,
    DateOnly? DataWaznosciLicencji, DateOnly DataWaznosciSzkolenia, bool Aktywny);

public record UtworzCzlonkaZalogiDto(
    [Required][MaxLength(100)] string Imie,
    [Required][MaxLength(100)] string Nazwisko,
    [Required][EmailAddress][MaxLength(100)] string Email,
    int WagaKg, int RolaId,
    [MaxLength(30)] string? NrLicencjiPilota,
    DateOnly? DataWaznosciLicencji,
    DateOnly DataWaznosciSzkolenia);

public record AktualizujCzlonkaZalogiDto(
    [Required][MaxLength(100)] string Imie,
    [Required][MaxLength(100)] string Nazwisko,
    [Required][EmailAddress][MaxLength(100)] string Email,
    int WagaKg, int RolaId,
    [MaxLength(30)] string? NrLicencjiPilota,
    DateOnly? DataWaznosciLicencji,
    DateOnly DataWaznosciSzkolenia,
    bool Aktywny);

// ── Lądowiska ─────────────────────────────────────────────────

public record LadowiskoDto(int Id, string Nazwa, double Szerokosc, double Dlugosc, string? Opis);

public record UtworzLadowiskoDto(
    [Required][MaxLength(200)] string Nazwa,
    double Szerokosc, double Dlugosc, string? Opis);

public record AktualizujLadowiskoDto(
    [Required][MaxLength(200)] string Nazwa,
    double Szerokosc, double Dlugosc, string? Opis);

// ── Planowane operacje ────────────────────────────────────────

public record PunktTrasyDto(int Kolejnosc, double Szerokosc, double Dlugosc);

public record OperacjaListDto(
    int Id, string Numer, string NumerZleceniaProjektu, string OpisSkrocony,
    List<string> RodzajeCzynnosci,
    DateOnly? ProponowanaDataOd, DateOnly? ProponowanaDataDo,
    DateOnly? PlanowanaDataOd, DateOnly? PlanowanaDataDo,
    int StatusId, string StatusNazwa);

public record OperacjaDto(
    int Id, string Numer, string NumerZleceniaProjektu, string OpisSkrocony,
    string? KmlNazwaPliku, int LiczbaKmTrasy,
    DateOnly? ProponowanaDataOd, DateOnly? ProponowanaDataDo,
    DateOnly? PlanowanaDataOd, DateOnly? PlanowanaDataDo,
    string? DodatkoweInfo, string? Komentarz, string? UwagiPoRealizacji,
    int StatusId, string StatusNazwa,
    int WprowadzajacyId, string WprowadzajacyEmail,
    List<int> RodzajeCzynnosciIds, List<string> RodzajeCzynnosciNazwy,
    List<PunktTrasyDto> PunktyTrasy,
    List<int> OsobyKontaktoweIds,
    DateTime CreatedAt, DateTime UpdatedAt);

public record UtworzOperacjeDto(
    [Required][MaxLength(30)] string NumerZleceniaProjektu,
    [Required][MaxLength(100)] string OpisSkrocony,
    [MaxLength(255)] string? KmlNazwaPliku,
    string? KmlZawartosc,
    int LiczbaKmTrasy,
    DateOnly? ProponowanaDataOd,
    DateOnly? ProponowanaDataDo,
    [MaxLength(500)] string? DodatkoweInfo,
    [Required] List<int> RodzajeCzynnosciIds,
    List<PunktTrasyDto> PunktyTrasy,
    List<int> OsobyKontaktoweIds);

public record AktualizujOperacjeDto(
    [Required][MaxLength(30)] string NumerZleceniaProjektu,
    [Required][MaxLength(100)] string OpisSkrocony,
    [MaxLength(255)] string? KmlNazwaPliku,
    string? KmlZawartosc,
    int LiczbaKmTrasy,
    DateOnly? ProponowanaDataOd,
    DateOnly? ProponowanaDataDo,
    DateOnly? PlanowanaDataOd,
    DateOnly? PlanowanaDataDo,
    [MaxLength(500)] string? DodatkoweInfo,
    [MaxLength(500)] string? Komentarz,
    [MaxLength(500)] string? UwagiPoRealizacji,
    [Required] List<int> RodzajeCzynnosciIds,
    List<PunktTrasyDto> PunktyTrasy,
    List<int> OsobyKontaktoweIds);

public record ZmienStatusOperacjiDto([Required] int StatusId, [MaxLength(500)] string? Komentarz);
public record KomentarzDto(int Id, string Tresc, string AutorEmail, DateTime CreatedAt);
public record DodajKomentarzDto([Required][MaxLength(500)] string Tresc);
public record HistoriaZmianyDto(int Id, string Pole, string? StaraWartosc, string? NowaWartosc, string ZmienionePrzezEmail, DateTime DataZmiany);

// ── Zlecenia na lot ───────────────────────────────────────────

public record ZlecenieListDto(
    int Id, string Numer, DateTime PlanowanyStartDt,
    string HelikopterNr, string PilotImieNazwisko,
    int StatusId, string StatusNazwa);

public record ZlecenieDto(
    int Id, string Numer,
    DateTime PlanowanyStartDt, DateTime PlanowaneLadowanieDt,
    DateTime? RzeczywistyStartDt, DateTime? RzeczywisteLadowanieDt,
    int PilotId, string PilotImieNazwisko,
    int HelikopterId, string HelikopterNr,
    int LadowiskoStartoweId, string LadowiskoStartoweNazwa,
    int LadowiskoKoncoweId, string LadowiskoKoncoweNazwa,
    int SzacowanaDlugoscTrasy, int WagaZalogiKg,
    int StatusId, string StatusNazwa,
    List<int> CzlonkowieZalogiIds,
    List<string> CzlonkowieZalogiImiona,
    List<int> OperacjeIds,
    DateTime CreatedAt, DateTime UpdatedAt);

public record UtworzZlecenieDto(
    [Required] DateTime PlanowanyStartDt,
    [Required] DateTime PlanowaneLadowanieDt,
    [Required] int HelikopterId,
    [Required] int LadowiskoStartoweId,
    [Required] int LadowiskoKoncoweId,
    int SzacowanaDlugoscTrasy,
    List<int> CzlonkowieZalogiIds,
    [Required] List<int> OperacjeIds);

public record AktualizujZlecenieDto(
    [Required] DateTime PlanowanyStartDt,
    [Required] DateTime PlanowaneLadowanieDt,
    DateTime? RzeczywistyStartDt,
    DateTime? RzeczywisteLadowanieDt,
    [Required] int HelikopterId,
    [Required] int LadowiskoStartoweId,
    [Required] int LadowiskoKoncoweId,
    int SzacowanaDlugoscTrasy,
    List<int> CzlonkowieZalogiIds,
    [Required] List<int> OperacjeIds);

public record ZmienStatusZlecenieDto([Required] int StatusId);
