using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace LotyApi.Data;

/// <summary>
/// Fabryka kontekstu bazy danych dla narzędzi EF Core CLI (dotnet ef migrations).
/// Pozwala generować migracje bez uruchamiania aplikacji.
/// Używa domyślnego connection stringa — w razie potrzeby można nadpisać
/// zmienną środowiskową CONNECTION_STRING.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<LotyDbContext>
{
    public LotyDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING")
                               ?? "Data Source=loty.db";

        var optionsBuilder = new DbContextOptionsBuilder<LotyDbContext>();
        optionsBuilder.UseSqlite(connectionString);

        return new LotyDbContext(optionsBuilder.Options);
    }
}
