namespace LotyApi.Models;

// ── Użytkownicy ────────────────────────────────────────────

public class Uzytkownik
{
    public int Id { get; set; }
    public string Imie { get; set; } = null!;
    public string Nazwisko { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string HasloHash { get; set; } = null!;
    public int RolaId { get; set; }
    public bool Aktywny { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Nawigacja
    public SlownikRolUzytkownikow Rola { get; set; } = null!;
    public ICollection<PlanowanaOperacja> WprowadzoneOperacje { get; set; } = [];
    public ICollection<OperacjaOsobaKontaktowa> OperacjeKontaktowe { get; set; } = [];
    public ICollection<OperacjaKomentarz> Komentarze { get; set; } = [];
    public ICollection<OperacjaHistoriaZmian> HistoriaOperacji { get; set; } = [];
    public ICollection<ZlecenieHistoriaZmian> HistoriaZlecen { get; set; } = [];
    public ICollection<ZlecenieNaLot> UtworzoneZlecenia { get; set; } = [];
}

// ── Helikoptery ─────────────────────────────────────────────

public class Helikopter
{
    public int Id { get; set; }
    public string NumerRejestracyjny { get; set; } = null!;
    public string Typ { get; set; } = null!;
    public string? Opis { get; set; }
    public int MaksLiczbaCzlonkowZalogi { get; set; }
    public int MaksUdzwigKg { get; set; }
    public int ZasiegKm { get; set; }
    public string Status { get; set; } = "aktywny";          // aktywny | nieaktywny
    public DateOnly? DataWaznosciPrzegladu { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ZlecenieNaLot> ZleceniaNaLot { get; set; } = [];
}

// ── Członkowie załogi ───────────────────────────────────────

public class CzlonekZalogi
{
    public int Id { get; set; }
    public string Imie { get; set; } = null!;
    public string Nazwisko { get; set; } = null!;
    public string Email { get; set; } = null!;
    public int WagaKg { get; set; }
    public int RolaId { get; set; }
    public string? NrLicencjiPilota { get; set; }
    public DateOnly? DataWaznosciLicencji { get; set; }
    public DateOnly DataWaznosciSzkolenia { get; set; }
    public bool Aktywny { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Nawigacja
    public SlownikRolZalogi Rola { get; set; } = null!;
    public ICollection<ZlecenieNaLot> ZleceniaJakoPilot { get; set; } = [];
    public ICollection<ZlecienieCzlonekZalogi> ZleceniaCzlonkowie { get; set; } = [];
}

// ── Lądowiska ───────────────────────────────────────────────

public class Ladowisko
{
    public int Id { get; set; }
    public string Nazwa { get; set; } = null!;
    public double Szerokosc { get; set; }       // latitude
    public double Dlugosc { get; set; }         // longitude
    public string? Opis { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ZlecenieNaLot> ZleceniaStart { get; set; } = [];
    public ICollection<ZlecenieNaLot> ZleceniaKoniec { get; set; } = [];
}
