namespace LotyApi.Common;

/// <summary>
/// Stałe nazw ról — eliminuje magic strings w atrybutach [Authorize] i logice biznesowej.
/// </summary>
public static class Role
{
    public const string Administrator      = "Administrator";
    public const string OsobaPlanujaca     = "Osoba planująca";
    public const string OsobaNadzorujaca   = "Osoba nadzorująca";
    public const string Pilot              = "Pilot";

    // Grupy do atrybutów [Authorize(Roles = ...)]
    public const string PlanowanieGroup    = $"{Administrator},{OsobaPlanujaca},{OsobaNadzorujaca}";
    public const string ZleceniaGroup      = $"{Administrator},{Pilot},{OsobaNadzorujaca}";
    public const string PilotGroup         = $"{Administrator},{Pilot}";
}

/// <summary>
/// Stałe statusów operacji — eliminuje magic numbers.
/// </summary>
public static class StatusOperacji
{
    public const int Wprowadzone           = 1;
    public const int Odrzucone             = 2;
    public const int PotwierdzoneDoPlan    = 3;
    public const int ZaplanowaneDoZlecenia = 4;
    public const int CzesciowoZrealizowane = 5;
    public const int Zrealizowane          = 6;
    public const int Rezygnacja            = 7;
}

/// <summary>
/// Stałe statusów zleceń — eliminuje magic numbers.
/// </summary>
public static class StatusZlecenia
{
    public const int Wprowadzone             = 1;
    public const int PrzekazaneDoAkceptacji  = 2;
    public const int Odrzucone               = 3;
    public const int Zaakceptowane           = 4;
    public const int ZrealizowaneWCzesci     = 5;
    public const int ZrealizowaneWCalosci    = 6;
    public const int NieZrealizowane         = 7;
}
