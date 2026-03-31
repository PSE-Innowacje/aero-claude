namespace LotyApi.Models;

/// <summary>
/// Refresh token przechowywany w bazie — umożliwia odwoływanie sesji.
/// </summary>
public class RefreshToken
{
    public int Id { get; set; }
    public string Token { get; set; } = null!;
    public int UzytkownikId { get; set; }
    public DateTime UtworzonoUtc { get; set; } = DateTime.UtcNow;
    public DateTime WygasaUtc { get; set; }
    public DateTime? OdwolanoUtc { get; set; }
    public string? ZastapionePrzez { get; set; }

    public bool JestAktywny => OdwolanoUtc is null && WygasaUtc > DateTime.UtcNow;

    // Nawigacja
    public Uzytkownik Uzytkownik { get; set; } = null!;
}
