using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace LotyApi.Tests.Pact;

/// <summary>
/// Middleware that handles Pact provider state setup requests.
/// PactNet sends POST /provider-states to set up test data before each interaction.
/// </summary>
internal class ProviderStateMiddleware
{
    private readonly RequestDelegate _next;
    private readonly PactTestWebAppFactory _factory;

    public ProviderStateMiddleware(RequestDelegate next, PactTestWebAppFactory factory)
    {
        _next = next;
        _factory = factory;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path == "/provider-states" && context.Request.Method == "POST")
        {
            using var reader = new StreamReader(context.Request.Body);
            var body = await reader.ReadToEndAsync();

            var providerState = JsonSerializer.Deserialize<ProviderStateRequest>(body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (providerState?.State != null)
            {
                _factory.SeedProviderState(providerState.State);
            }

            context.Response.StatusCode = 200;
            return;
        }

        await _next(context);
    }
}

public class ProviderStateRequest
{
    public string? State { get; set; }
    public string? Action { get; set; }
    public Dictionary<string, string>? Params { get; set; }
}
