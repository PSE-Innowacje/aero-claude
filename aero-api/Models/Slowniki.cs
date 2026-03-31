namespace LotyApi.Models;

// ── Słowniki ────────────────────────────────────────────────

public class SlownikRolUzytkownikow
{
    public int Id { get; set; }
    public string Nazwa { get; set; } = null!;

    public ICollection<Uzytkownik> Uzytkownicy { get; set; } = [];
}

public class SlownikRolZalogi
{
    public int Id { get; set; }
    public string Nazwa { get; set; } = null!;

    public ICollection<CzlonekZalogi> CzlonkowieZalogi { get; set; } = [];
}

public class SlownikRodzajowCzynnosci
{
    public int Id { get; set; }
    public string Nazwa { get; set; } = null!;

    public ICollection<OperacjaRodzajCzynnosci> OperacjeRodzaje { get; set; } = [];
}

public class SlownikStatusowOperacji
{
    public int Id { get; set; }
    public string Nazwa { get; set; } = null!;

    public ICollection<PlanowanaOperacja> PlanowaneOperacje { get; set; } = [];
}

public class SlownikStatusowZlecen
{
    public int Id { get; set; }
    public string Nazwa { get; set; } = null!;

    public ICollection<ZlecenieNaLot> ZleceniaNaLot { get; set; } = [];
}
