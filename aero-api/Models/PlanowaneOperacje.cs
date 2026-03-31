namespace LotyApi.Models;

// ── Planowana operacja lotnicza ─────────────────────────────

public class PlanowanaOperacja
{
    public int Id { get; set; }
    public string Numer { get; set; } = null!;
    public string NumerZleceniaProjektu { get; set; } = null!;
    public string OpisSkrocony { get; set; } = null!;
    public string? KmlNazwaPliku { get; set; }
    public string? KmlZawartosc { get; set; }
    public int LiczbaKmTrasy { get; set; }
    public DateOnly? ProponowanaDataOd { get; set; }
    public DateOnly? ProponowanaDataDo { get; set; }
    public DateOnly? PlanowanaDataOd { get; set; }
    public DateOnly? PlanowanaDataDo { get; set; }
    public string? DodatkoweInfo { get; set; }
    public string? Komentarz { get; set; }
    public string? UwagiPoRealizacji { get; set; }
    public int StatusId { get; set; }
    public int WprowadzajacyId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Nawigacja
    public SlownikStatusowOperacji Status { get; set; } = null!;
    public Uzytkownik Wprowadzajacy { get; set; } = null!;
    public ICollection<OperacjaPunktTrasy> PunktyTrasy { get; set; } = [];
    public ICollection<OperacjaRodzajCzynnosci> RodzajeCzynnosci { get; set; } = [];
    public ICollection<OperacjaOsobaKontaktowa> OsobyKontaktowe { get; set; } = [];
    public ICollection<OperacjaKomentarz> Komentarze { get; set; } = [];
    public ICollection<OperacjaHistoriaZmian> HistoriaZmian { get; set; } = [];
    public ICollection<ZlecenieOperacja> ZlecenieOperacje { get; set; } = [];
}

// ── Punkt trasy operacji ────────────────────────────────────

public class OperacjaPunktTrasy
{
    public int Id { get; set; }
    public int OperacjaId { get; set; }
    public int Kolejnosc { get; set; }
    public double Szerokosc { get; set; }
    public double Dlugosc { get; set; }

    public PlanowanaOperacja Operacja { get; set; } = null!;
}

// ── Rodzaje czynności operacji (M:N) ───────────────────────

public class OperacjaRodzajCzynnosci
{
    public int OperacjaId { get; set; }
    public int RodzajCzynnosciId { get; set; }

    public PlanowanaOperacja Operacja { get; set; } = null!;
    public SlownikRodzajowCzynnosci RodzajCzynnosci { get; set; } = null!;
}

// ── Osoby kontaktowe operacji (M:N) ────────────────────────

public class OperacjaOsobaKontaktowa
{
    public int OperacjaId { get; set; }
    public int UzytkownikId { get; set; }

    public PlanowanaOperacja Operacja { get; set; } = null!;
    public Uzytkownik Uzytkownik { get; set; } = null!;
}

// ── Komentarze do operacji ─────────────────────────────────

public class OperacjaKomentarz
{
    public int Id { get; set; }
    public int OperacjaId { get; set; }
    public string Tresc { get; set; } = null!;
    public int AutorId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public PlanowanaOperacja Operacja { get; set; } = null!;
    public Uzytkownik Autor { get; set; } = null!;
}

// ── Historia zmian operacji ────────────────────────────────

public class OperacjaHistoriaZmian
{
    public int Id { get; set; }
    public int OperacjaId { get; set; }
    public string Pole { get; set; } = null!;
    public string? StaraWartosc { get; set; }
    public string? NowaWartosc { get; set; }
    public int ZmienionePrzez { get; set; }
    public DateTime DataZmiany { get; set; } = DateTime.UtcNow;

    public PlanowanaOperacja Operacja { get; set; } = null!;
    public Uzytkownik ZmienionePrzezNav { get; set; } = null!;
}
