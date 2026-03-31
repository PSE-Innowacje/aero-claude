namespace LotyApi.Common;

/// <summary>
/// Dane bieżącego użytkownika wyciągnięte z JWT claimów.
/// Przekazywane z kontrolera do serwisu — serwis nie musi znać HttpContext.
/// </summary>
public record CurrentUser(int Id, string Email, string Rola);
