namespace LotyApi.Common;

/// <summary>
/// Ustandaryzowany wynik operacji serwisowej.
/// Serwis nigdy nie rzuca wyjątków dla błędów biznesowych — zamiast tego zwraca ServiceResult.
/// Kontroler mapuje ServiceResult na odpowiedni kod HTTP.
/// </summary>
public class ServiceResult
{
    public bool Success { get; init; }
    public IReadOnlyList<string> Errors { get; init; } = [];
    public ServiceErrorKind ErrorKind { get; init; }

    public static ServiceResult Ok() =>
        new() { Success = true };

    public static ServiceResult Fail(ServiceErrorKind kind, params string[] errors) =>
        new() { Success = false, ErrorKind = kind, Errors = errors };

    public static ServiceResult Fail(ServiceErrorKind kind, IEnumerable<string> errors) =>
        new() { Success = false, ErrorKind = kind, Errors = errors.ToList() };
}

public class ServiceResult<T> : ServiceResult
{
    public T? Data { get; init; }

    public static ServiceResult<T> Ok(T data) =>
        new() { Success = true, Data = data };

    public new static ServiceResult<T> Fail(ServiceErrorKind kind, params string[] errors) =>
        new() { Success = false, ErrorKind = kind, Errors = errors };

    public new static ServiceResult<T> Fail(ServiceErrorKind kind, IEnumerable<string> errors) =>
        new() { Success = false, ErrorKind = kind, Errors = errors.ToList() };
}

/// <summary>
/// Rodzaj błędu — kontroler mapuje go na odpowiedni kod HTTP.
/// </summary>
public enum ServiceErrorKind
{
    /// <summary>400 — błąd walidacji / logiki biznesowej</summary>
    Validation,

    /// <summary>403 — brak uprawnień do tej operacji</summary>
    Forbidden,

    /// <summary>404 — zasób nie istnieje</summary>
    NotFound,

    /// <summary>409 — konflikt (np. duplikat emaila)</summary>
    Conflict,
}
