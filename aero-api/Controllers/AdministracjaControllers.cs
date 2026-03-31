using LotyApi.Common;
using LotyApi.Data;
using LotyApi.DTOs;
using LotyApi.Models;
using LotyApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LotyApi.Controllers;

// ── Użytkownicy ──────────────────────────────────────────────

[ApiController]
[Route("api/uzytkownicy")]
[Authorize(Roles = Role.Administrator)]
[Produces("application/json")]
public class UzytkownicyController(LotyDbContext db, IAuthService authService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<List<UzytkownikDto>>), 200)]
    public async Task<IActionResult> Lista(CancellationToken ct) =>
        Ok(ApiResult<List<UzytkownikDto>>.Ok(
            await db.Uzytkownicy
                .Include(u => u.Rola)
                .AsNoTracking()
                .OrderBy(u => u.Email)
                .Select(u => new UzytkownikDto(u.Id, u.Imie, u.Nazwisko, u.Email, u.RolaId, u.Rola.Nazwa, u.Aktywny))
                .ToListAsync(ct)));

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<UzytkownikDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct)
    {
        var u = await db.Uzytkownicy.Include(x => x.Rola).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (u is null) return NotFound(ApiResult.Fail($"Użytkownik {id} nie istnieje."));
        return Ok(ApiResult<UzytkownikDto>.Ok(
            new UzytkownikDto(u.Id, u.Imie, u.Nazwisko, u.Email, u.RolaId, u.Rola.Nazwa, u.Aktywny)));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> Utworz([FromBody] UtworzUzytkownikaDto dto, CancellationToken ct)
    {
        if (await db.Uzytkownicy.AnyAsync(u => u.Email == dto.Email, ct))
            return Conflict(ApiResult.Fail($"Użytkownik z emailem '{dto.Email}' już istnieje."));

        var uzytkownik = new Uzytkownik
        {
            Imie = dto.Imie, Nazwisko = dto.Nazwisko,
            Email = dto.Email,
            HasloHash = authService.HashPassword(dto.Haslo),
            RolaId = dto.RolaId
        };
        db.Uzytkownicy.Add(uzytkownik);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Szczegoly), new { id = uzytkownik.Id },
            ApiResult<int>.Ok(uzytkownik.Id));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujUzytkownikaDto dto, CancellationToken ct)
    {
        var u = await db.Uzytkownicy.FindAsync([id], ct);
        if (u is null) return NotFound(ApiResult.Fail($"Użytkownik {id} nie istnieje."));
        u.Imie = dto.Imie; u.Nazwisko = dto.Nazwisko;
        u.Email = dto.Email; u.RolaId = dto.RolaId; u.Aktywny = dto.Aktywny;
        u.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Lista aktywnych użytkowników do wyboru jako osoby kontaktowe – dostępna dla wszystkich zalogowanych.</summary>
    [HttpGet("kontakty")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResult<List<UzytkownikDto>>), 200)]
    public async Task<IActionResult> Kontakty(CancellationToken ct) =>
        Ok(ApiResult<List<UzytkownikDto>>.Ok(
            await db.Uzytkownicy
                .Include(u => u.Rola)
                .AsNoTracking()
                .Where(u => u.Aktywny)
                .OrderBy(u => u.Nazwisko).ThenBy(u => u.Imie)
                .Select(u => new UzytkownikDto(u.Id, u.Imie, u.Nazwisko, u.Email, u.RolaId, u.Rola.Nazwa, u.Aktywny))
                .ToListAsync(ct)));
}

// ── Helikoptery ──────────────────────────────────────────────

[ApiController]
[Route("api/helikoptery")]
[Authorize]
[Produces("application/json")]
public class HelikopteryController(LotyDbContext db) : ControllerBase
{
    private static HelikopterDto ToDto(Helikopter h) => new(
        h.Id, h.NumerRejestracyjny, h.Typ, h.Opis,
        h.MaksLiczbaCzlonkowZalogi, h.MaksUdzwigKg, h.ZasiegKm,
        h.Status, h.DataWaznosciPrzegladu);

    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<List<HelikopterDto>>), 200)]
    public async Task<IActionResult> Lista(CancellationToken ct) =>
        Ok(ApiResult<List<HelikopterDto>>.Ok(
            await db.Helikoptery.AsNoTracking()
                .OrderBy(h => h.Status).ThenBy(h => h.NumerRejestracyjny)
                .Select(h => ToDto(h)).ToListAsync(ct)));

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<HelikopterDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct)
    {
        var h = await db.Helikoptery.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return h is null
            ? NotFound(ApiResult.Fail($"Helikopter {id} nie istnieje."))
            : Ok(ApiResult<HelikopterDto>.Ok(ToDto(h)));
    }

    [HttpPost]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    public async Task<IActionResult> Utworz([FromBody] UtworzHelikopterDto dto, CancellationToken ct)
    {
        var h = new Helikopter
        {
            NumerRejestracyjny = dto.NumerRejestracyjny, Typ = dto.Typ, Opis = dto.Opis,
            MaksLiczbaCzlonkowZalogi = dto.MaksLiczbaCzlonkowZalogi,
            MaksUdzwigKg = dto.MaksUdzwigKg, ZasiegKm = dto.ZasiegKm,
            Status = dto.Status, DataWaznosciPrzegladu = dto.DataWaznosciPrzegladu
        };
        db.Helikoptery.Add(h);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Szczegoly), new { id = h.Id }, ApiResult<int>.Ok(h.Id));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujHelikopterDto dto, CancellationToken ct)
    {
        var h = await db.Helikoptery.FindAsync([id], ct);
        if (h is null) return NotFound(ApiResult.Fail($"Helikopter {id} nie istnieje."));
        h.NumerRejestracyjny = dto.NumerRejestracyjny; h.Typ = dto.Typ; h.Opis = dto.Opis;
        h.MaksLiczbaCzlonkowZalogi = dto.MaksLiczbaCzlonkowZalogi;
        h.MaksUdzwigKg = dto.MaksUdzwigKg; h.ZasiegKm = dto.ZasiegKm;
        h.Status = dto.Status; h.DataWaznosciPrzegladu = dto.DataWaznosciPrzegladu;
        h.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

// ── Członkowie załogi ────────────────────────────────────────

[ApiController]
[Route("api/czlonkowie-zalogi")]
[Authorize]
[Produces("application/json")]
public class CzlonkowieZalogiController(LotyDbContext db) : ControllerBase
{
    private static CzlonekZalogiDto ToDto(CzlonekZalogi c) => new(
        c.Id, c.Imie, c.Nazwisko, c.Email, c.WagaKg,
        c.RolaId, c.Rola?.Nazwa ?? "",
        c.NrLicencjiPilota, c.DataWaznosciLicencji,
        c.DataWaznosciSzkolenia, c.Aktywny);

    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<List<CzlonekZalogiDto>>), 200)]
    public async Task<IActionResult> Lista(CancellationToken ct) =>
        Ok(ApiResult<List<CzlonekZalogiDto>>.Ok(
            await db.CzlonkowieZalogi.Include(c => c.Rola).AsNoTracking()
                .OrderBy(c => c.Email)
                .Select(c => ToDto(c)).ToListAsync(ct)));

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<CzlonekZalogiDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct)
    {
        var c = await db.CzlonkowieZalogi.Include(x => x.Rola).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null
            ? NotFound(ApiResult.Fail($"Członek załogi {id} nie istnieje."))
            : Ok(ApiResult<CzlonekZalogiDto>.Ok(ToDto(c)));
    }

    [HttpPost]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    public async Task<IActionResult> Utworz([FromBody] UtworzCzlonkaZalogiDto dto, CancellationToken ct)
    {
        var c = new CzlonekZalogi
        {
            Imie = dto.Imie, Nazwisko = dto.Nazwisko, Email = dto.Email,
            WagaKg = dto.WagaKg, RolaId = dto.RolaId,
            NrLicencjiPilota = dto.NrLicencjiPilota,
            DataWaznosciLicencji = dto.DataWaznosciLicencji,
            DataWaznosciSzkolenia = dto.DataWaznosciSzkolenia
        };
        db.CzlonkowieZalogi.Add(c);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Szczegoly), new { id = c.Id }, ApiResult<int>.Ok(c.Id));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujCzlonkaZalogiDto dto, CancellationToken ct)
    {
        var c = await db.CzlonkowieZalogi.FindAsync([id], ct);
        if (c is null) return NotFound(ApiResult.Fail($"Członek załogi {id} nie istnieje."));
        c.Imie = dto.Imie; c.Nazwisko = dto.Nazwisko; c.Email = dto.Email;
        c.WagaKg = dto.WagaKg; c.RolaId = dto.RolaId;
        c.NrLicencjiPilota = dto.NrLicencjiPilota;
        c.DataWaznosciLicencji = dto.DataWaznosciLicencji;
        c.DataWaznosciSzkolenia = dto.DataWaznosciSzkolenia;
        c.Aktywny = dto.Aktywny; c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

// ── Lądowiska ────────────────────────────────────────────────

[ApiController]
[Route("api/ladowiska")]
[Authorize]
[Produces("application/json")]
public class LadowiskaController(LotyDbContext db) : ControllerBase
{
    private static LadowiskoDto ToDto(Ladowisko l) =>
        new(l.Id, l.Nazwa, l.Szerokosc, l.Dlugosc, l.Opis);

    [HttpGet]
    [ProducesResponseType(typeof(ApiResult<List<LadowiskoDto>>), 200)]
    public async Task<IActionResult> Lista(CancellationToken ct) =>
        Ok(ApiResult<List<LadowiskoDto>>.Ok(
            await db.Ladowiska.AsNoTracking()
                .OrderBy(l => l.Nazwa)
                .Select(l => ToDto(l)).ToListAsync(ct)));

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResult<LadowiskoDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Szczegoly(int id, CancellationToken ct)
    {
        var l = await db.Ladowiska.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return l is null
            ? NotFound(ApiResult.Fail($"Lądowisko {id} nie istnieje."))
            : Ok(ApiResult<LadowiskoDto>.Ok(ToDto(l)));
    }

    [HttpPost]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(typeof(ApiResult<int>), 201)]
    public async Task<IActionResult> Utworz([FromBody] UtworzLadowiskoDto dto, CancellationToken ct)
    {
        var l = new Ladowisko
            { Nazwa = dto.Nazwa, Szerokosc = dto.Szerokosc, Dlugosc = dto.Dlugosc, Opis = dto.Opis };
        db.Ladowiska.Add(l);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Szczegoly), new { id = l.Id }, ApiResult<int>.Ok(l.Id));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Role.Administrator)]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Aktualizuj(int id, [FromBody] AktualizujLadowiskoDto dto, CancellationToken ct)
    {
        var l = await db.Ladowiska.FindAsync([id], ct);
        if (l is null) return NotFound(ApiResult.Fail($"Lądowisko {id} nie istnieje."));
        l.Nazwa = dto.Nazwa; l.Szerokosc = dto.Szerokosc;
        l.Dlugosc = dto.Dlugosc; l.Opis = dto.Opis;
        l.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
