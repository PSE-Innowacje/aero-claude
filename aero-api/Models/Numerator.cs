namespace LotyApi.Models;

/// <summary>
/// Tabela licznikowa do atomowego generowania numerów sekwencyjnych.
/// Klucz złożony (Prefix, Rok) — jeden wiersz per typ dokumentu per rok.
/// </summary>
public class Numerator
{
    public string Prefix { get; set; } = null!;   // "OP" | "ZL"
    public int Rok { get; set; }
    public int OstatniaWartosc { get; set; }
}
