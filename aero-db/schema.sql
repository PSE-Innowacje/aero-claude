-- ============================================================
-- BAZA DANYCH: Ewidencja planowanych operacji lotniczych
-- SQLite
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================================
-- SŁOWNIKI
-- ============================================================

-- Słownik ról użytkowników systemu
CREATE TABLE slownik_rol_uzytkownikow (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    nazwa   TEXT NOT NULL UNIQUE  -- 'Administrator', 'Osoba planująca', 'Osoba nadzorująca', 'Pilot'
);

-- Słownik ról członków załogi
CREATE TABLE slownik_rol_zalogi (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    nazwa   TEXT NOT NULL UNIQUE  -- 'Pilot', 'Obserwator', ...
);

-- Słownik rodzajów czynności lotniczych
CREATE TABLE slownik_rodzajow_czynnosci (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    nazwa   TEXT NOT NULL UNIQUE  -- 'Oględziny wizualne', 'Skan 3D', 'Lokalizacja awarii', 'Zdjęcia', 'Patrolowanie', ...
);

-- Słownik statusów planowanych operacji lotniczych
CREATE TABLE slownik_statusow_operacji (
    id      INTEGER PRIMARY KEY,
    nazwa   TEXT NOT NULL UNIQUE
    -- 1 Wprowadzone
    -- 2 Odrzucone
    -- 3 Potwierdzone do planu
    -- 4 Zaplanowane do zlecenia
    -- 5 Częściowo zrealizowane
    -- 6 Zrealizowane
    -- 7 Rezygnacja
);

-- Słownik statusów zleceń na lot
CREATE TABLE slownik_statusow_zlecen (
    id      INTEGER PRIMARY KEY,
    nazwa   TEXT NOT NULL UNIQUE
    -- 1 Wprowadzone
    -- 2 Przekazane do akceptacji
    -- 3 Odrzucone
    -- 4 Zaakceptowane
    -- 5 Zrealizowane w części
    -- 6 Zrealizowane w całości
    -- 7 Nie zrealizowane
);


-- ============================================================
-- ADMINISTRACJA
-- ============================================================

-- Użytkownicy systemu
CREATE TABLE uzytkownicy (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    imie        TEXT    NOT NULL CHECK(length(imie) <= 100),
    nazwisko    TEXT    NOT NULL CHECK(length(nazwisko) <= 100),
    email       TEXT    NOT NULL UNIQUE CHECK(
                    length(email) <= 100
                    AND email GLOB '*@*.*'           -- uproszczona walidacja SQLite
                ),
    haslo_hash  TEXT    NOT NULL,                   -- bcrypt / argon2 hash
    rola_id     INTEGER NOT NULL REFERENCES slownik_rol_uzytkownikow(id),
    aktywny     INTEGER  NOT NULL DEFAULT 1 CHECK(aktywny IN (0,1)),
    created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Helikoptery
CREATE TABLE helikoptery (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    numer_rejestracyjny         TEXT    NOT NULL UNIQUE CHECK(length(numer_rejestracyjny) <= 30),
    typ                         TEXT    NOT NULL CHECK(length(typ) <= 100),
    opis                        TEXT             CHECK(length(opis) <= 100),
    maks_liczba_czlonkow_zalogi INTEGER NOT NULL CHECK(maks_liczba_czlonkow_zalogi BETWEEN 1 AND 10),
    maks_udzwig_kg              INTEGER NOT NULL CHECK(maks_udzwig_kg BETWEEN 1 AND 1000),
    zasieg_km                   INTEGER NOT NULL CHECK(zasieg_km BETWEEN 1 AND 1000),
    status                      TEXT     NOT NULL DEFAULT 'aktywny' CHECK(status IN ('aktywny','nieaktywny')),
    data_waznosci_przegladu     DATE              CHECK(
                                    (status = 'aktywny' AND data_waznosci_przegladu IS NOT NULL)
                                    OR status = 'nieaktywny'
                                ),
    created_at                  DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at                  DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Członkowie załogi
CREATE TABLE czlonkowie_zalogi (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    imie                    TEXT    NOT NULL CHECK(length(imie) <= 100),
    nazwisko                TEXT    NOT NULL CHECK(length(nazwisko) <= 100),
    email                   TEXT    NOT NULL UNIQUE CHECK(
                                length(email) <= 100
                                AND email GLOB '*@*.*'
                            ),
    waga_kg                 INTEGER NOT NULL CHECK(waga_kg BETWEEN 30 AND 200),
    rola_id                 INTEGER NOT NULL REFERENCES slownik_rol_zalogi(id),
    nr_licencji_pilota      TEXT             CHECK(
                                length(nr_licencji_pilota) <= 30
                            ),
    data_waznosci_licencji  DATE,           -- wymagane gdy rola = Pilot (walidacja w aplikacji)
    data_waznosci_szkolenia DATE     NOT NULL,
    aktywny                 INTEGER  NOT NULL DEFAULT 1 CHECK(aktywny IN (0,1)),
    created_at              DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at              DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Lądowiska planowe
CREATE TABLE ladowiska (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nazwa       TEXT    NOT NULL UNIQUE CHECK(length(nazwa) <= 200),
    szerokosc   REAL    NOT NULL,   -- latitude
    dlugosc     REAL    NOT NULL,   -- longitude
    opis        TEXT,
    created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);


-- ============================================================
-- PLANOWANE OPERACJE LOTNICZE
-- ============================================================

CREATE TABLE planowane_operacje (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    numer                       TEXT    NOT NULL UNIQUE,        -- generowany automatycznie, np. "OP-2026-001"
    numer_zlecenia_projektu     TEXT    NOT NULL CHECK(length(numer_zlecenia_projektu) <= 30),
    opis_skrocony               TEXT    NOT NULL CHECK(length(opis_skrocony) <= 100),

    -- Trasa (dane KML przechowywane jako tekst; punkty w osobnej tabeli)
    kml_nazwa_pliku             TEXT,
    kml_zawartosc               TEXT,                          -- surowy XML/KML (do 5000 punktów)
    liczba_km_trasy             INTEGER NOT NULL,              -- obliczane na podstawie KML

    -- Proponowane daty (od osoby planującej)
    proponowana_data_od         DATE,
    proponowana_data_do         DATE,

    -- Planowane daty (ustawiane przez osobę nadzorującą)
    planowana_data_od           DATE,
    planowana_data_do           DATE,

    -- Dodatkowe informacje
    dodatkowe_info              TEXT    CHECK(length(dodatkowe_info) <= 500),
    komentarz                   TEXT    CHECK(length(komentarz) <= 500),   -- ostatni wpis; pełna historia w tabeli komentarzy
    uwagi_po_realizacji         TEXT    CHECK(length(uwagi_po_realizacji) <= 500),

    -- Status
    status_id                   INTEGER  NOT NULL DEFAULT 1 REFERENCES slownik_statusow_operacji(id),

    -- Osoba wprowadzająca
    wprowadzajacy_id            INTEGER  NOT NULL REFERENCES uzytkownicy(id),

    created_at                  DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at                  DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Punkty trasy planowanej operacji (odczytane z KML)
CREATE TABLE operacja_punkty_trasy (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    operacja_id INTEGER NOT NULL REFERENCES planowane_operacje(id) ON DELETE CASCADE,
    kolejnosc   INTEGER NOT NULL,
    szerokosc   REAL    NOT NULL,
    dlugosc     REAL    NOT NULL,
    UNIQUE (operacja_id, kolejnosc)
);

-- Rodzaje czynności dla operacji (relacja wiele-do-wielu)
CREATE TABLE operacja_rodzaje_czynnosci (
    operacja_id         INTEGER NOT NULL REFERENCES planowane_operacje(id) ON DELETE CASCADE,
    rodzaj_czynnosci_id INTEGER NOT NULL REFERENCES slownik_rodzajow_czynnosci(id),
    PRIMARY KEY (operacja_id, rodzaj_czynnosci_id)
);

-- Osoby kontaktowe dla operacji (relacja wiele-do-wielu z użytkownikami)
CREATE TABLE operacja_osoby_kontaktowe (
    operacja_id     INTEGER NOT NULL REFERENCES planowane_operacje(id) ON DELETE CASCADE,
    uzytkownik_id   INTEGER NOT NULL REFERENCES uzytkownicy(id),
    PRIMARY KEY (operacja_id, uzytkownik_id)
);

-- Komentarze do operacji (lista kolejnych wpisów)
CREATE TABLE operacja_komentarze (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    operacja_id INTEGER NOT NULL REFERENCES planowane_operacje(id) ON DELETE CASCADE,
    tresc       TEXT    NOT NULL CHECK(length(tresc) <= 500),
    autor_id    INTEGER  NOT NULL REFERENCES uzytkownicy(id),
    created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Historia zmian statusów i planowanych dat operacji
CREATE TABLE operacja_historia_zmian (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    operacja_id     INTEGER NOT NULL REFERENCES planowane_operacje(id) ON DELETE CASCADE,
    pole            TEXT    NOT NULL,   -- np. 'status', 'planowana_data_od', 'planowana_data_do'
    stara_wartosc   TEXT,
    nowa_wartosc    TEXT,
    zmieniony_przez INTEGER  NOT NULL REFERENCES uzytkownicy(id),
    data_zmiany     DATETIME NOT NULL DEFAULT (datetime('now'))
);


-- ============================================================
-- ZLECENIA NA LOT
-- ============================================================

CREATE TABLE zlecenia_na_lot (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    numer                       TEXT    NOT NULL UNIQUE,        -- generowany automatycznie, np. "ZL-2026-001"

    -- Planowane czasy
    planowany_start_dt          DATETIME NOT NULL,
    planowane_ladowanie_dt      DATETIME NOT NULL,

    -- Rzeczywiste czasy (wymagane przed zmianą statusu na 5/6)
    rzeczywisty_start_dt        DATETIME,
    rzeczywiste_ladowanie_dt    DATETIME,

    -- Obsada
    pilot_id                    INTEGER  NOT NULL REFERENCES czlonkowie_zalogi(id),
    helikopter_id               INTEGER  NOT NULL REFERENCES helikoptery(id),

    -- Trasa
    ladowisko_startowe_id       INTEGER  NOT NULL REFERENCES ladowiska(id),
    ladowisko_koncowe_id        INTEGER  NOT NULL REFERENCES ladowiska(id),
    szacowana_dlugosc_trasy_km  INTEGER  NOT NULL,

    -- Waga
    waga_zalogi_kg              INTEGER  NOT NULL,               -- obliczana automatycznie

    -- Status
    status_id                   INTEGER  NOT NULL DEFAULT 1 REFERENCES slownik_statusow_zlecen(id),

    -- Autor (pilot tworzący zlecenie)
    tworzacy_id                 INTEGER  NOT NULL REFERENCES uzytkownicy(id),

    created_at                  DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at                  DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- Dodatkowi członkowie załogi zlecenia (poza pilotem)
CREATE TABLE zlecenie_czlonkowie_zalogi (
    zlecenie_id     INTEGER NOT NULL REFERENCES zlecenia_na_lot(id) ON DELETE CASCADE,
    czlonek_id      INTEGER NOT NULL REFERENCES czlonkowie_zalogi(id),
    PRIMARY KEY (zlecenie_id, czlonek_id)
);

-- Planowane operacje lotnicze powiązane ze zleceniem (wiele-do-wielu)
CREATE TABLE zlecenie_operacje (
    zlecenie_id INTEGER NOT NULL REFERENCES zlecenia_na_lot(id) ON DELETE CASCADE,
    operacja_id INTEGER NOT NULL REFERENCES planowane_operacje(id),
    PRIMARY KEY (zlecenie_id, operacja_id)
);

-- Historia zmian statusów zleceń
CREATE TABLE zlecenie_historia_zmian (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    zlecenie_id     INTEGER NOT NULL REFERENCES zlecenia_na_lot(id) ON DELETE CASCADE,
    pole            TEXT    NOT NULL,   -- np. 'status'
    stara_wartosc   TEXT,
    nowa_wartosc    TEXT,
    zmieniony_przez INTEGER  NOT NULL REFERENCES uzytkownicy(id),
    data_zmiany     DATETIME NOT NULL DEFAULT (datetime('now'))
);


-- ============================================================
-- INDEKSY
-- ============================================================

-- Użytkownicy
CREATE INDEX idx_uzytkownicy_email       ON uzytkownicy(email);
CREATE INDEX idx_uzytkownicy_rola        ON uzytkownicy(rola_id);

-- Helikoptery
CREATE INDEX idx_helikoptery_status      ON helikoptery(status);

-- Członkowie załogi
CREATE INDEX idx_zaloga_email            ON czlonkowie_zalogi(email);
CREATE INDEX idx_zaloga_rola             ON czlonkowie_zalogi(rola_id);

-- Planowane operacje
CREATE INDEX idx_operacje_status         ON planowane_operacje(status_id);
CREATE INDEX idx_operacje_planowana_od   ON planowane_operacje(planowana_data_od);
CREATE INDEX idx_operacje_wprowadzajacy  ON planowane_operacje(wprowadzajacy_id);

-- Zlecenia
CREATE INDEX idx_zlecenia_status         ON zlecenia_na_lot(status_id);
CREATE INDEX idx_zlecenia_pilot          ON zlecenia_na_lot(pilot_id);
CREATE INDEX idx_zlecenia_helikopter     ON zlecenia_na_lot(helikopter_id);
CREATE INDEX idx_zlecenia_start_dt       ON zlecenia_na_lot(planowany_start_dt);

-- Relacje
CREATE INDEX idx_zlec_oper_operacja      ON zlecenie_operacje(operacja_id);
CREATE INDEX idx_operacja_punkty         ON operacja_punkty_trasy(operacja_id, kolejnosc);


-- ============================================================
-- DANE INICJALNE (słowniki)
-- ============================================================

INSERT INTO slownik_rol_uzytkownikow (nazwa) VALUES
    ('Administrator'),
    ('Osoba planująca'),
    ('Osoba nadzorująca'),
    ('Pilot');

INSERT INTO slownik_rol_zalogi (nazwa) VALUES
    ('Pilot'),
    ('Obserwator');

INSERT INTO slownik_rodzajow_czynnosci (nazwa) VALUES
    ('Oględziny wizualne'),
    ('Skan 3D'),
    ('Lokalizacja awarii'),
    ('Zdjęcia'),
    ('Patrolowanie');

INSERT INTO slownik_statusow_operacji (id, nazwa) VALUES
    (1, 'Wprowadzone'),
    (2, 'Odrzucone'),
    (3, 'Potwierdzone do planu'),
    (4, 'Zaplanowane do zlecenia'),
    (5, 'Częściowo zrealizowane'),
    (6, 'Zrealizowane'),
    (7, 'Rezygnacja');

INSERT INTO slownik_statusow_zlecen (id, nazwa) VALUES
    (1, 'Wprowadzone'),
    (2, 'Przekazane do akceptacji'),
    (3, 'Odrzucone'),
    (4, 'Zaakceptowane'),
    (5, 'Zrealizowane w części'),
    (6, 'Zrealizowane w całości'),
    (7, 'Nie zrealizowane');
