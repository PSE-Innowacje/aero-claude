namespace LotyApi.Models;

// ── Zlecenie na lot ─────────────────────────────────────────

public class ZlecenieNaLot
{
    public int Id { get; set; }
    public string Numer { get; set; } = null!;
    public DateTime PlanowanyStartDt { get; set; }
    public DateTime PlanowaneLadowanieDt { get; set; }
    public DateTime? RzeczywistyStartDt { get; set; }
    public DateTime? RzeczywisteLadowanieDt { get; set; }
    public int PilotId { get; set; }
    public int HelikopterId { get; set; }
    public int LadowiskoStartoweId { get; set; }
    public int LadowiskoKoncoweId { get; set; }
    public int SzacowanaDlugoscTrasy { get; set; }
    public int WagaZalogiKg { get; set; }
    public int StatusId { get; set; }
    public int TworzacyId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Nawigacja
    public CzlonekZalogi Pilot { get; set; } = null!;
    public Helikopter Helikopter { get; set; } = null!;
    public Ladowisko LadowiskoStartowe { get; set; } = null!;
    public Ladowisko LadowiskoKoncowe { get; set; } = null!;
    public SlownikStatusowZlecen Status { get; set; } = null!;
    public Uzytkownik Tworzacy { get; set; } = null!;
    public ICollection<ZlecienieCzlonekZalogi> CzlonkowieZalogi { get; set; } = [];
    public ICollection<ZlecenieOperacja> ZlecenieOperacje { get; set; } = [];
    public ICollection<ZlecenieHistoriaZmian> HistoriaZmian { get; set; } = [];
}

// ── Członkowie załogi zlecenia (M:N) ───────────────────────

public class ZlecienieCzlonekZalogi
{
    public int ZlecenieId { get; set; }
    public int CzlonekId { get; set; }

    public ZlecenieNaLot Zlecenie { get; set; } = null!;
    public CzlonekZalogi Czlonek { get; set; } = null!;
}

// ── Operacje w zleceniu (M:N) ──────────────────────────────

public class ZlecenieOperacja
{
    public int ZlecenieId { get; set; }
    public int OperacjaId { get; set; }

    public ZlecenieNaLot Zlecenie { get; set; } = null!;
    public PlanowanaOperacja Operacja { get; set; } = null!;
}

// ── Historia zmian zlecenia ────────────────────────────────

public class ZlecenieHistoriaZmian
{
    public int Id { get; set; }
    public int ZlecenieId { get; set; }
    public string Pole { get; set; } = null!;
    public string? StaraWartosc { get; set; }
    public string? NowaWartosc { get; set; }
    public int ZmienionePrzez { get; set; }
    public DateTime DataZmiany { get; set; } = DateTime.UtcNow;

    public ZlecenieNaLot Zlecenie { get; set; } = null!;
    public Uzytkownik ZmienionePrzezNav { get; set; } = null!;
}
