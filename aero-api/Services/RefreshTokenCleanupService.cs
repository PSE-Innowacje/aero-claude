using LotyApi.Data;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Services;

/// <summary>
/// Periodycznie usuwa wygasłe i odwołane refresh tokeny z bazy danych.
/// </summary>
public class RefreshTokenCleanupService(
    IServiceScopeFactory scopeFactory,
    IConfiguration config,
    ILogger<RefreshTokenCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalHours = config.GetValue("Jwt:TokenCleanupIntervalHours", 24);

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromHours(intervalHours), stoppingToken);

            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<LotyDbContext>();

                var cutoff = DateTime.UtcNow;
                var deleted = await db.RefreshTokens
                    .Where(rt => rt.WygasaUtc < cutoff || rt.OdwolanoUtc != null)
                    .ExecuteDeleteAsync(stoppingToken);

                if (deleted > 0)
                    logger.LogInformation("Usunięto {Count} wygasłych/odwołanych refresh tokenów", deleted);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Błąd podczas czyszczenia refresh tokenów");
            }
        }
    }
}
