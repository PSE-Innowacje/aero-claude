using Microsoft.EntityFrameworkCore;
using LotyApi.Models;

namespace LotyApi.Data;

public class LotyDbContext(DbContextOptions<LotyDbContext> options) : DbContext(options)
{
    // ── Słowniki ─────────────────────────────────────────────
    public DbSet<SlownikRolUzytkownikow> SlownikRolUzytkownikow => Set<SlownikRolUzytkownikow>();
    public DbSet<SlownikRolZalogi> SlownikRolZalogi => Set<SlownikRolZalogi>();
    public DbSet<SlownikRodzajowCzynnosci> SlownikRodzajowCzynnosci => Set<SlownikRodzajowCzynnosci>();
    public DbSet<SlownikStatusowOperacji> SlownikStatusowOperacji => Set<SlownikStatusowOperacji>();
    public DbSet<SlownikStatusowZlecen> SlownikStatusowZlecen => Set<SlownikStatusowZlecen>();

    // ── Administracja ─────────────────────────────────────────
    public DbSet<Uzytkownik> Uzytkownicy => Set<Uzytkownik>();
    public DbSet<Helikopter> Helikoptery => Set<Helikopter>();
    public DbSet<CzlonekZalogi> CzlonkowieZalogi => Set<CzlonekZalogi>();
    public DbSet<Ladowisko> Ladowiska => Set<Ladowisko>();

    // ── Operacje ──────────────────────────────────────────────
    public DbSet<PlanowanaOperacja> PlanowaneOperacje => Set<PlanowanaOperacja>();
    public DbSet<OperacjaPunktTrasy> OperacjePunktyTrasy => Set<OperacjaPunktTrasy>();
    public DbSet<OperacjaRodzajCzynnosci> OperacjeRodzajeCzynnosci => Set<OperacjaRodzajCzynnosci>();
    public DbSet<OperacjaOsobaKontaktowa> OperacjeOsobyKontaktowe => Set<OperacjaOsobaKontaktowa>();
    public DbSet<OperacjaKomentarz> OperacjeKomentarze => Set<OperacjaKomentarz>();
    public DbSet<OperacjaHistoriaZmian> OperacjeHistoriaZmian => Set<OperacjaHistoriaZmian>();

    // ── Zlecenia ──────────────────────────────────────────────
    public DbSet<ZlecenieNaLot> ZleceniaNaLot => Set<ZlecenieNaLot>();
    public DbSet<ZlecienieCzlonekZalogi> ZlecieniaCzlonkowieZalogi => Set<ZlecienieCzlonekZalogi>();
    public DbSet<ZlecenieOperacja> ZlecenieOperacje => Set<ZlecenieOperacja>();
    public DbSet<ZlecenieHistoriaZmian> ZlecenieHistoriaZmian => Set<ZlecenieHistoriaZmian>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // ── Mapowanie nazw tabel ──────────────────────────────
        mb.Entity<SlownikRolUzytkownikow>().ToTable("slownik_rol_uzytkownikow");
        mb.Entity<SlownikRolZalogi>().ToTable("slownik_rol_zalogi");
        mb.Entity<SlownikRodzajowCzynnosci>().ToTable("slownik_rodzajow_czynnosci");
        mb.Entity<SlownikStatusowOperacji>().ToTable("slownik_statusow_operacji");
        mb.Entity<SlownikStatusowZlecen>().ToTable("slownik_statusow_zlecen");
        mb.Entity<Uzytkownik>().ToTable("uzytkownicy");
        mb.Entity<Helikopter>().ToTable("helikoptery");
        mb.Entity<CzlonekZalogi>().ToTable("czlonkowie_zalogi");
        mb.Entity<Ladowisko>().ToTable("ladowiska");
        mb.Entity<PlanowanaOperacja>().ToTable("planowane_operacje");
        mb.Entity<OperacjaPunktTrasy>().ToTable("operacja_punkty_trasy");
        mb.Entity<OperacjaRodzajCzynnosci>().ToTable("operacja_rodzaje_czynnosci");
        mb.Entity<OperacjaOsobaKontaktowa>().ToTable("operacja_osoby_kontaktowe");
        mb.Entity<OperacjaKomentarz>().ToTable("operacja_komentarze");
        mb.Entity<OperacjaHistoriaZmian>().ToTable("operacja_historia_zmian");
        mb.Entity<ZlecenieNaLot>().ToTable("zlecenia_na_lot");
        mb.Entity<ZlecienieCzlonekZalogi>().ToTable("zlecenie_czlonkowie_zalogi");
        mb.Entity<ZlecenieOperacja>().ToTable("zlecenie_operacje");
        mb.Entity<ZlecenieHistoriaZmian>().ToTable("zlecenie_historia_zmian");

        // ── Mapowanie kolumn ──────────────────────────────────

        // Uzytkownik
        mb.Entity<Uzytkownik>(e =>
        {
            e.Property(x => x.Imie).HasColumnName("imie").HasMaxLength(100);
            e.Property(x => x.Nazwisko).HasColumnName("nazwisko").HasMaxLength(100);
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(100);
            e.Property(x => x.HasloHash).HasColumnName("haslo_hash");
            e.Property(x => x.RolaId).HasColumnName("rola_id");
            e.Property(x => x.Aktywny).HasColumnName("aktywny");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.Email).IsUnique().HasDatabaseName("idx_uzytkownicy_email");
            e.HasOne(x => x.Rola).WithMany(r => r.Uzytkownicy).HasForeignKey(x => x.RolaId);
        });

        // Helikopter
        mb.Entity<Helikopter>(e =>
        {
            e.Property(x => x.NumerRejestracyjny).HasColumnName("numer_rejestracyjny").HasMaxLength(30);
            e.Property(x => x.Typ).HasColumnName("typ").HasMaxLength(100);
            e.Property(x => x.Opis).HasColumnName("opis").HasMaxLength(100);
            e.Property(x => x.MaksLiczbaCzlonkowZalogi).HasColumnName("maks_liczba_czlonkow_zalogi");
            e.Property(x => x.MaksUdzwigKg).HasColumnName("maks_udzwig_kg");
            e.Property(x => x.ZasiegKm).HasColumnName("zasieg_km");
            e.Property(x => x.Status).HasColumnName("status").HasDefaultValue("aktywny");
            e.Property(x => x.DataWaznosciPrzegladu).HasColumnName("data_waznosci_przegladu").HasColumnType("DATE");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.Status).HasDatabaseName("idx_helikoptery_status");
        });

        // CzlonekZalogi
        mb.Entity<CzlonekZalogi>(e =>
        {
            e.Property(x => x.Imie).HasColumnName("imie").HasMaxLength(100);
            e.Property(x => x.Nazwisko).HasColumnName("nazwisko").HasMaxLength(100);
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(100);
            e.Property(x => x.WagaKg).HasColumnName("waga_kg");
            e.Property(x => x.RolaId).HasColumnName("rola_id");
            e.Property(x => x.NrLicencjiPilota).HasColumnName("nr_licencji_pilota").HasMaxLength(30);
            e.Property(x => x.DataWaznosciLicencji).HasColumnName("data_waznosci_licencji").HasColumnType("DATE");
            e.Property(x => x.DataWaznosciSzkolenia).HasColumnName("data_waznosci_szkolenia").HasColumnType("DATE");
            e.Property(x => x.Aktywny).HasColumnName("aktywny");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.Email).IsUnique().HasDatabaseName("idx_zaloga_email");
            e.HasOne(x => x.Rola).WithMany(r => r.CzlonkowieZalogi).HasForeignKey(x => x.RolaId);
        });

        // Ladowisko
        mb.Entity<Ladowisko>(e =>
        {
            e.Property(x => x.Nazwa).HasColumnName("nazwa").HasMaxLength(200);
            e.Property(x => x.Szerokosc).HasColumnName("szerokosc");
            e.Property(x => x.Dlugosc).HasColumnName("dlugosc");
            e.Property(x => x.Opis).HasColumnName("opis");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        // PlanowanaOperacja
        mb.Entity<PlanowanaOperacja>(e =>
        {
            e.Property(x => x.Numer).HasColumnName("numer").HasMaxLength(30);
            e.Property(x => x.NumerZleceniaProjektu).HasColumnName("numer_zlecenia_projektu").HasMaxLength(30);
            e.Property(x => x.OpisSkrocony).HasColumnName("opis_skrocony").HasMaxLength(100);
            e.Property(x => x.KmlNazwaPliku).HasColumnName("kml_nazwa_pliku");
            e.Property(x => x.KmlZawartosc).HasColumnName("kml_zawartosc");
            e.Property(x => x.LiczbaKmTrasy).HasColumnName("liczba_km_trasy");
            e.Property(x => x.ProponowanaDataOd).HasColumnName("proponowana_data_od").HasColumnType("DATE");
            e.Property(x => x.ProponowanaDataDo).HasColumnName("proponowana_data_do").HasColumnType("DATE");
            e.Property(x => x.PlanowanaDataOd).HasColumnName("planowana_data_od").HasColumnType("DATE");
            e.Property(x => x.PlanowanaDataDo).HasColumnName("planowana_data_do").HasColumnType("DATE");
            e.Property(x => x.DodatkoweInfo).HasColumnName("dodatkowe_info").HasMaxLength(500);
            e.Property(x => x.Komentarz).HasColumnName("komentarz").HasMaxLength(500);
            e.Property(x => x.UwagiPoRealizacji).HasColumnName("uwagi_po_realizacji").HasMaxLength(500);
            e.Property(x => x.StatusId).HasColumnName("status_id");
            e.Property(x => x.WprowadzajacyId).HasColumnName("wprowadzajacy_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.StatusId).HasDatabaseName("idx_operacje_status");
            e.HasIndex(x => x.PlanowanaDataOd).HasDatabaseName("idx_operacje_planowana_od");
            e.HasOne(x => x.Status).WithMany(s => s.PlanowaneOperacje).HasForeignKey(x => x.StatusId);
            e.HasOne(x => x.Wprowadzajacy).WithMany(u => u.WprowadzoneOperacje).HasForeignKey(x => x.WprowadzajacyId);
        });

        // OperacjaPunktTrasy
        mb.Entity<OperacjaPunktTrasy>(e =>
        {
            e.Property(x => x.OperacjaId).HasColumnName("operacja_id");
            e.Property(x => x.Kolejnosc).HasColumnName("kolejnosc");
            e.Property(x => x.Szerokosc).HasColumnName("szerokosc");
            e.Property(x => x.Dlugosc).HasColumnName("dlugosc");
            e.HasIndex(x => new { x.OperacjaId, x.Kolejnosc }).HasDatabaseName("idx_operacja_punkty");
            e.HasOne(x => x.Operacja).WithMany(o => o.PunktyTrasy).HasForeignKey(x => x.OperacjaId).OnDelete(DeleteBehavior.Cascade);
        });

        // OperacjaRodzajCzynnosci (M:N klucz złożony)
        mb.Entity<OperacjaRodzajCzynnosci>(e =>
        {
            e.HasKey(x => new { x.OperacjaId, x.RodzajCzynnosciId });
            e.Property(x => x.OperacjaId).HasColumnName("operacja_id");
            e.Property(x => x.RodzajCzynnosciId).HasColumnName("rodzaj_czynnosci_id");
            e.HasOne(x => x.Operacja).WithMany(o => o.RodzajeCzynnosci).HasForeignKey(x => x.OperacjaId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.RodzajCzynnosci).WithMany(r => r.OperacjeRodzaje).HasForeignKey(x => x.RodzajCzynnosciId);
        });

        // OperacjaOsobaKontaktowa (M:N klucz złożony)
        mb.Entity<OperacjaOsobaKontaktowa>(e =>
        {
            e.HasKey(x => new { x.OperacjaId, x.UzytkownikId });
            e.Property(x => x.OperacjaId).HasColumnName("operacja_id");
            e.Property(x => x.UzytkownikId).HasColumnName("uzytkownik_id");
            e.HasOne(x => x.Operacja).WithMany(o => o.OsobyKontaktowe).HasForeignKey(x => x.OperacjaId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Uzytkownik).WithMany(u => u.OperacjeKontaktowe).HasForeignKey(x => x.UzytkownikId);
        });

        // OperacjaKomentarz
        mb.Entity<OperacjaKomentarz>(e =>
        {
            e.Property(x => x.OperacjaId).HasColumnName("operacja_id");
            e.Property(x => x.Tresc).HasColumnName("tresc").HasMaxLength(500);
            e.Property(x => x.AutorId).HasColumnName("autor_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.Operacja).WithMany(o => o.Komentarze).HasForeignKey(x => x.OperacjaId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Autor).WithMany(u => u.Komentarze).HasForeignKey(x => x.AutorId);
        });

        // OperacjaHistoriaZmian
        mb.Entity<OperacjaHistoriaZmian>(e =>
        {
            e.Property(x => x.OperacjaId).HasColumnName("operacja_id");
            e.Property(x => x.Pole).HasColumnName("pole");
            e.Property(x => x.StaraWartosc).HasColumnName("stara_wartosc");
            e.Property(x => x.NowaWartosc).HasColumnName("nowa_wartosc");
            e.Property(x => x.ZmienionePrzez).HasColumnName("zmieniony_przez");
            e.Property(x => x.DataZmiany).HasColumnName("data_zmiany");
            e.HasOne(x => x.Operacja).WithMany(o => o.HistoriaZmian).HasForeignKey(x => x.OperacjaId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ZmienionePrzezNav).WithMany(u => u.HistoriaOperacji).HasForeignKey(x => x.ZmienionePrzez);
        });

        // ZlecenieNaLot
        mb.Entity<ZlecenieNaLot>(e =>
        {
            e.Property(x => x.Numer).HasColumnName("numer").HasMaxLength(30);
            e.Property(x => x.PlanowanyStartDt).HasColumnName("planowany_start_dt");
            e.Property(x => x.PlanowaneLadowanieDt).HasColumnName("planowane_ladowanie_dt");
            e.Property(x => x.RzeczywistyStartDt).HasColumnName("rzeczywisty_start_dt");
            e.Property(x => x.RzeczywisteLadowanieDt).HasColumnName("rzeczywiste_ladowanie_dt");
            e.Property(x => x.PilotId).HasColumnName("pilot_id");
            e.Property(x => x.HelikopterId).HasColumnName("helikopter_id");
            e.Property(x => x.LadowiskoStartoweId).HasColumnName("ladowisko_startowe_id");
            e.Property(x => x.LadowiskoKoncoweId).HasColumnName("ladowisko_koncowe_id");
            e.Property(x => x.SzacowanaDlugoscTrasy).HasColumnName("szacowana_dlugosc_trasy_km");
            e.Property(x => x.WagaZalogiKg).HasColumnName("waga_zalogi_kg");
            e.Property(x => x.StatusId).HasColumnName("status_id");
            e.Property(x => x.TworzacyId).HasColumnName("tworzacy_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasIndex(x => x.StatusId).HasDatabaseName("idx_zlecenia_status");
            e.HasIndex(x => x.PilotId).HasDatabaseName("idx_zlecenia_pilot");
            e.HasIndex(x => x.HelikopterId).HasDatabaseName("idx_zlecenia_helikopter");
            e.HasIndex(x => x.PlanowanyStartDt).HasDatabaseName("idx_zlecenia_start_dt");
            e.HasOne(x => x.Pilot).WithMany(c => c.ZleceniaJakoPilot).HasForeignKey(x => x.PilotId);
            e.HasOne(x => x.Helikopter).WithMany(h => h.ZleceniaNaLot).HasForeignKey(x => x.HelikopterId);
            e.HasOne(x => x.LadowiskoStartowe).WithMany(l => l.ZleceniaStart).HasForeignKey(x => x.LadowiskoStartoweId);
            e.HasOne(x => x.LadowiskoKoncowe).WithMany(l => l.ZleceniaKoniec).HasForeignKey(x => x.LadowiskoKoncoweId);
            e.HasOne(x => x.Status).WithMany(s => s.ZleceniaNaLot).HasForeignKey(x => x.StatusId);
            e.HasOne(x => x.Tworzacy).WithMany(u => u.UtworzoneZlecenia).HasForeignKey(x => x.TworzacyId);
        });

        // ZlecienieCzlonekZalogi (M:N klucz złożony)
        mb.Entity<ZlecienieCzlonekZalogi>(e =>
        {
            e.HasKey(x => new { x.ZlecenieId, x.CzlonekId });
            e.Property(x => x.ZlecenieId).HasColumnName("zlecenie_id");
            e.Property(x => x.CzlonekId).HasColumnName("czlonek_id");
            e.HasOne(x => x.Zlecenie).WithMany(z => z.CzlonkowieZalogi).HasForeignKey(x => x.ZlecenieId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Czlonek).WithMany(c => c.ZleceniaCzlonkowie).HasForeignKey(x => x.CzlonekId);
        });

        // ZlecenieOperacja (M:N klucz złożony)
        mb.Entity<ZlecenieOperacja>(e =>
        {
            e.HasKey(x => new { x.ZlecenieId, x.OperacjaId });
            e.Property(x => x.ZlecenieId).HasColumnName("zlecenie_id");
            e.Property(x => x.OperacjaId).HasColumnName("operacja_id");
            e.HasIndex(x => x.OperacjaId).HasDatabaseName("idx_zlec_oper_operacja");
            e.HasOne(x => x.Zlecenie).WithMany(z => z.ZlecenieOperacje).HasForeignKey(x => x.ZlecenieId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Operacja).WithMany(o => o.ZlecenieOperacje).HasForeignKey(x => x.OperacjaId);
        });

        // ZlecenieHistoriaZmian
        mb.Entity<ZlecenieHistoriaZmian>(e =>
        {
            e.Property(x => x.ZlecenieId).HasColumnName("zlecenie_id");
            e.Property(x => x.Pole).HasColumnName("pole");
            e.Property(x => x.StaraWartosc).HasColumnName("stara_wartosc");
            e.Property(x => x.NowaWartosc).HasColumnName("nowa_wartosc");
            e.Property(x => x.ZmienionePrzez).HasColumnName("zmieniony_przez");
            e.Property(x => x.DataZmiany).HasColumnName("data_zmiany");
            e.HasOne(x => x.Zlecenie).WithMany(z => z.HistoriaZmian).HasForeignKey(x => x.ZlecenieId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.ZmienionePrzezNav).WithMany(u => u.HistoriaZlecen).HasForeignKey(x => x.ZmienionePrzez);
        });

        // Słowniki – nazwy kolumn
        mb.Entity<SlownikRolUzytkownikow>(e => e.Property(x => x.Nazwa).HasColumnName("nazwa"));
        mb.Entity<SlownikRolZalogi>(e => e.Property(x => x.Nazwa).HasColumnName("nazwa"));
        mb.Entity<SlownikRodzajowCzynnosci>(e => e.Property(x => x.Nazwa).HasColumnName("nazwa"));
        mb.Entity<SlownikStatusowOperacji>(e => e.Property(x => x.Nazwa).HasColumnName("nazwa"));
        mb.Entity<SlownikStatusowZlecen>(e => e.Property(x => x.Nazwa).HasColumnName("nazwa"));
    }
}
