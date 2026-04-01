using System.Security.Claims;
using LotyApi.Common;
using Microsoft.AspNetCore.Mvc;

namespace LotyApi.Controllers;

/// <summary>
/// Rozszerzenia eliminujące powtarzalny kod w kontrolerach:
/// - Mapowanie ServiceResult → IActionResult
/// - Wyciąganie CurrentUser z JWT claimów
/// </summary>
public static class ControllerExtensions
{
    /// <summary>
    /// Mapuje ServiceResult na odpowiedni kod HTTP z ustandaryzowanym ApiResult.
    /// </summary>
    public static IActionResult ToActionResult(this ControllerBase controller, ServiceResult result)
    {
        if (result.Success)
            return controller.NoContent();

        return MapError(controller, result);
    }

    /// <summary>
    /// Mapuje ServiceResult&lt;T&gt; na odpowiedni kod HTTP z ustandaryzowanym ApiResult.
    /// </summary>
    public static IActionResult ToActionResult<T>(this ControllerBase controller, ServiceResult<T> result)
    {
        if (result.Success)
            return controller.Ok(ApiResult<T>.Ok(result.Data!));

        return MapError(controller, result);
    }

    /// <summary>
    /// Mapuje ServiceResult&lt;int&gt; na 201 Created z location header.
    /// </summary>
    public static IActionResult ToCreatedResult(
        this ControllerBase controller,
        ServiceResult<int> result,
        string actionName)
    {
        if (result.Success)
            return controller.CreatedAtAction(actionName, new { id = result.Data },
                ApiResult<int>.Ok(result.Data));

        return MapError(controller, result);
    }

    /// <summary>
    /// Wyciąga dane zalogowanego użytkownika z JWT claimów.
    /// </summary>
    public static CurrentUser GetCurrentUser(this ControllerBase controller)
    {
        var idClaim = controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(idClaim) || !int.TryParse(idClaim, out var userId))
            throw new UnauthorizedAccessException("Brak wymaganych claimów w tokenie JWT.");

        var email = controller.User.FindFirstValue(ClaimTypes.Email) ?? "";
        var rola = controller.User.FindFirstValue(ClaimTypes.Role) ?? "";

        return new CurrentUser(userId, email, rola);
    }

    // ── Private ───────────────────────────────────────────────

    private static IActionResult MapError(ControllerBase controller, ServiceResult result)
    {
        var apiResult = ApiResult.Fail(result.Errors.ToArray());

        return result.ErrorKind switch
        {
            ServiceErrorKind.NotFound   => controller.NotFound(apiResult),
            ServiceErrorKind.Forbidden  => new ObjectResult(apiResult) { StatusCode = 403 },
            ServiceErrorKind.Conflict   => controller.Conflict(apiResult),
            ServiceErrorKind.Validation => controller.BadRequest(apiResult),
            _                           => controller.BadRequest(apiResult),
        };
    }
}
