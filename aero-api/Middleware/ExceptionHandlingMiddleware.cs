using System.Net;
using System.Text.Json;
using LotyApi.Common;

namespace LotyApi.Middleware;

/// <summary>
/// Globalny handler wyjątków — zamiast propagowania stosu wywołań do klienta
/// zwraca ustandaryzowany JSON z kodem błędu.
/// </summary>
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Nieobsłużony wyjątek: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            ArgumentException     => (HttpStatusCode.BadRequest,            "Nieprawidłowe dane wejściowe."),
            UnauthorizedAccessException => (HttpStatusCode.Forbidden,       "Brak dostępu."),
            KeyNotFoundException  => (HttpStatusCode.NotFound,              "Zasób nie istnieje."),
            InvalidOperationException => (HttpStatusCode.UnprocessableEntity, "Operacja nie może być wykonana."),
            _                     => (HttpStatusCode.InternalServerError,   "Wystąpił błąd serwera.")
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var result = ApiResult.Fail(message);
        await context.Response.WriteAsync(JsonSerializer.Serialize(result, JsonOptions));
    }
}
