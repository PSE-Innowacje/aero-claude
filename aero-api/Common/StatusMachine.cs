namespace LotyApi.Common;

/// <summary>
/// Scentralizowana maszyna stanów dla operacji i zleceń.
/// Jedno źródło prawdy o dozwolonych przejściach — eliminuje duplikację
/// reguł rozproszoną wcześniej w kontrolerach.
/// </summary>
public static class StatusMachine
{
    // ── Operacje ──────────────────────────────────────────────

    private static readonly HashSet<(string Rola, int ZStatusu, int NaStatus)> DozwolonePrzejsciaOperacji =
    [
        // Osoba nadzorująca
        (Role.OsobaNadzorujaca, StatusOperacji.Wprowadzone, StatusOperacji.Odrzucone),
        (Role.OsobaNadzorujaca, StatusOperacji.Wprowadzone, StatusOperacji.PotwierdzoneDoPlan),

        // Osoba planująca
        (Role.OsobaPlanujaca, StatusOperacji.Wprowadzone,           StatusOperacji.Rezygnacja),
        (Role.OsobaPlanujaca, StatusOperacji.PotwierdzoneDoPlan,    StatusOperacji.Rezygnacja),
        (Role.OsobaPlanujaca, StatusOperacji.ZaplanowaneDoZlecenia, StatusOperacji.Rezygnacja),
    ];

    /// <summary>Statusy, w których Osoba planująca może edytować operację.</summary>
    private static readonly HashSet<int> EdycjaDozwolonaOsobaPlanujaca =
    [
        StatusOperacji.Wprowadzone,
        StatusOperacji.Odrzucone,
        StatusOperacji.PotwierdzoneDoPlan,
        StatusOperacji.ZaplanowaneDoZlecenia,
        StatusOperacji.CzesciowoZrealizowane,
    ];

    /// <summary>
    /// Sprawdza czy zmiana statusu operacji jest dozwolona dla danej roli.
    /// Administrator może wykonać dowolne przejście.
    /// </summary>
    public static bool CzyPrzejscieOperacjiDozwolone(string rola, int zStatusu, int naStatus)
    {
        if (rola == Role.Administrator) return true;
        return DozwolonePrzejsciaOperacji.Contains((rola, zStatusu, naStatus));
    }

    /// <summary>
    /// Sprawdza czy użytkownik o danej roli może edytować operację w podanym statusie.
    /// </summary>
    public static bool CzyEdycjaOperacjiDozwolona(string rola, int statusId)
    {
        if (rola == Role.Administrator || rola == Role.OsobaNadzorujaca) return true;
        if (rola == Role.OsobaPlanujaca) return EdycjaDozwolonaOsobaPlanujaca.Contains(statusId);
        return false;
    }

    // ── Zlecenia ──────────────────────────────────────────────

    private static readonly HashSet<(string Rola, int ZStatusu, int NaStatus)> DozwolonePrzejsciaZlecen =
    [
        // Pilot
        (Role.Pilot, StatusZlecenia.Wprowadzone,   StatusZlecenia.PrzekazaneDoAkceptacji),
        (Role.Pilot, StatusZlecenia.Zaakceptowane,  StatusZlecenia.ZrealizowaneWCzesci),
        (Role.Pilot, StatusZlecenia.Zaakceptowane,  StatusZlecenia.ZrealizowaneWCalosci),
        (Role.Pilot, StatusZlecenia.Zaakceptowane,  StatusZlecenia.NieZrealizowane),

        // Osoba nadzorująca
        (Role.OsobaNadzorujaca, StatusZlecenia.PrzekazaneDoAkceptacji, StatusZlecenia.Odrzucone),
        (Role.OsobaNadzorujaca, StatusZlecenia.PrzekazaneDoAkceptacji, StatusZlecenia.Zaakceptowane),
    ];

    /// <summary>
    /// Sprawdza czy zmiana statusu zlecenia jest dozwolona dla danej roli.
    /// Administrator może wykonać dowolne przejście.
    /// </summary>
    public static bool CzyPrzejscieZleceniaDozwolone(string rola, int zStatusu, int naStatus)
    {
        if (rola == Role.Administrator) return true;
        return DozwolonePrzejsciaZlecen.Contains((rola, zStatusu, naStatus));
    }

    // ── Kaskadowe zmiany statusów operacji przy zmianie statusu zlecenia ──

    /// <summary>
    /// Zwraca docelowy status operacji przy zmianie statusu zlecenia.
    /// Null jeśli operacja nie powinna zmienić statusu.
    /// </summary>
    public static int? DocelowyStatusOperacjiPrzyZmianieZlecenia(
        int nowyStatusZlecenia, int aktualnyStatusOperacji)
    {
        var (wymaganyStatus, docelowyStatus) = nowyStatusZlecenia switch
        {
            StatusZlecenia.ZrealizowaneWCzesci  => (StatusOperacji.ZaplanowaneDoZlecenia, StatusOperacji.CzesciowoZrealizowane),
            StatusZlecenia.ZrealizowaneWCalosci => (StatusOperacji.ZaplanowaneDoZlecenia, StatusOperacji.Zrealizowane),
            StatusZlecenia.NieZrealizowane      => (StatusOperacji.ZaplanowaneDoZlecenia, StatusOperacji.PotwierdzoneDoPlan),
            _ => (0, 0)
        };

        if (docelowyStatus != 0 && aktualnyStatusOperacji == wymaganyStatus)
            return docelowyStatus;

        return null;
    }
}
