-- ============================================================================
-- Skrypt migracji bazy danych "loty" z SQLite do PostgreSQL
-- Wygenerowano: 2026-03-31
-- ============================================================================
-- Użycie:
--   psql -U <użytkownik> -d <baza_docelowa> -f migrate_loty_to_postgresql.sql
--
-- Skrypt jest idempotentny – można go uruchomić wielokrotnie (DROP IF EXISTS).
-- Cała migracja odbywa się w jednej transakcji.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CZYSZCZENIE – usunięcie istniejących obiektów (w kolejności zależności)
-- ============================================================================

DROP TABLE IF EXISTS zlecenie_operacje            CASCADE;
DROP TABLE IF EXISTS zlecenie_historia_zmian       CASCADE;
DROP TABLE IF EXISTS zlecenie_czlonkowie_zalogi    CASCADE;
DROP TABLE IF EXISTS zlecenia_na_lot               CASCADE;
DROP TABLE IF EXISTS operacja_rodzaje_czynnosci    CASCADE;
DROP TABLE IF EXISTS operacja_punkty_trasy         CASCADE;
DROP TABLE IF EXISTS operacja_osoby_kontaktowe     CASCADE;
DROP TABLE IF EXISTS operacja_komentarze           CASCADE;
DROP TABLE IF EXISTS operacja_historia_zmian       CASCADE;
DROP TABLE IF EXISTS planowane_operacje            CASCADE;
DROP TABLE IF EXISTS refresh_tokens                CASCADE;
DROP TABLE IF EXISTS czlonkowie_zalogi             CASCADE;
DROP TABLE IF EXISTS helikoptery                   CASCADE;
DROP TABLE IF EXISTS ladowiska                     CASCADE;
DROP TABLE IF EXISTS uzytkownicy                   CASCADE;
DROP TABLE IF EXISTS slownik_rodzajow_czynnosci    CASCADE;
DROP TABLE IF EXISTS slownik_rol_uzytkownikow      CASCADE;
DROP TABLE IF EXISTS slownik_rol_zalogi            CASCADE;
DROP TABLE IF EXISTS slownik_statusow_operacji     CASCADE;
DROP TABLE IF EXISTS slownik_statusow_zlecen       CASCADE;

DROP FUNCTION IF EXISTS fn_ustaw_updated_at()      CASCADE;
DROP TYPE     IF EXISTS helikopter_status           CASCADE;

-- ============================================================================
-- 2. TYP WYLICZENIOWY (ENUM)
-- ============================================================================

CREATE TYPE helikopter_status AS ENUM ('aktywny', 'nieaktywny');

-- ============================================================================
-- 3. TABELE SŁOWNIKOWE
-- ============================================================================

CREATE TABLE slownik_rol_uzytkownikow (
    id      SERIAL       PRIMARY KEY,
    nazwa   VARCHAR(100) NOT NULL UNIQUE
);
COMMENT ON TABLE slownik_rol_uzytkownikow IS 'Słownik ról użytkowników systemu';

CREATE TABLE slownik_rol_zalogi (
    id      SERIAL       PRIMARY KEY,
    nazwa   VARCHAR(100) NOT NULL UNIQUE
);
COMMENT ON TABLE slownik_rol_zalogi IS 'Słownik ról członków załogi helikoptera';

CREATE TABLE slownik_statusow_operacji (
    id      INTEGER      PRIMARY KEY,
    nazwa   VARCHAR(100) NOT NULL UNIQUE
);
COMMENT ON TABLE slownik_statusow_operacji IS 'Słownik statusów planowanych operacji (1-7)';

CREATE TABLE slownik_statusow_zlecen (
    id      INTEGER      PRIMARY KEY,
    nazwa   VARCHAR(100) NOT NULL UNIQUE
);
COMMENT ON TABLE slownik_statusow_zlecen IS 'Słownik statusów zleceń na lot (1-7)';

CREATE TABLE slownik_rodzajow_czynnosci (
    id      SERIAL       PRIMARY KEY,
    nazwa   VARCHAR(200) NOT NULL UNIQUE
);
COMMENT ON TABLE slownik_rodzajow_czynnosci IS 'Słownik rodzajów czynności w operacji';

-- ============================================================================
-- 4. TABELE GŁÓWNE
-- ============================================================================

-- Użytkownicy systemu
CREATE TABLE uzytkownicy (
    id          SERIAL       PRIMARY KEY,
    imie        VARCHAR(100) NOT NULL,
    nazwisko    VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE,
    haslo_hash  TEXT         NOT NULL,
    rola_id     INTEGER      NOT NULL REFERENCES slownik_rol_uzytkownikow(id),
    aktywny     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_uzytkownicy_email CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
COMMENT ON TABLE uzytkownicy IS 'Użytkownicy systemu – logowanie, role, autoryzacja';

-- Refresh tokens (JWT)
CREATE TABLE refresh_tokens (
    id                  SERIAL    PRIMARY KEY,
    token               TEXT      NOT NULL,
    uzytkownik_id       INTEGER   NOT NULL REFERENCES uzytkownicy(id) ON DELETE CASCADE,
    utworzono_utc        TEXT      NOT NULL,
    wygasa_utc          TEXT      NOT NULL,
    odwolano_utc        TEXT,
    zastapione_przez    TEXT
);
COMMENT ON TABLE refresh_tokens IS 'Tokeny odświeżania JWT powiązane z użytkownikami';

-- Członkowie załogi
CREATE TABLE czlonkowie_zalogi (
    id                      SERIAL       PRIMARY KEY,
    imie                    VARCHAR(100) NOT NULL,
    nazwisko                VARCHAR(100) NOT NULL,
    email                   VARCHAR(100) NOT NULL UNIQUE,
    waga_kg                 INTEGER      NOT NULL,
    rola_id                 INTEGER      NOT NULL REFERENCES slownik_rol_zalogi(id),
    nr_licencji_pilota      VARCHAR(30),
    data_waznosci_licencji  DATE,
    data_waznosci_szkolenia DATE         NOT NULL,
    aktywny                 BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_zaloga_email CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT chk_zaloga_waga  CHECK (waga_kg BETWEEN 30 AND 200)
);
COMMENT ON TABLE czlonkowie_zalogi IS 'Członkowie załogi helikopterów (piloci, obserwatorzy)';

-- Helikoptery
CREATE TABLE helikoptery (
    id                          SERIAL            PRIMARY KEY,
    numer_rejestracyjny         VARCHAR(30)       NOT NULL UNIQUE,
    typ                         VARCHAR(100)      NOT NULL,
    opis                        VARCHAR(100),
    maks_liczba_czlonkow_zalogi INTEGER           NOT NULL,
    maks_udzwig_kg              INTEGER           NOT NULL,
    zasieg_km                   INTEGER           NOT NULL,
    status                      helikopter_status NOT NULL DEFAULT 'aktywny',
    data_waznosci_przegladu     DATE,
    created_at                  TIMESTAMP         NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP         NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_heli_czlonkowie CHECK (maks_liczba_czlonkow_zalogi BETWEEN 1 AND 10),
    CONSTRAINT chk_heli_udzwig     CHECK (maks_udzwig_kg BETWEEN 1 AND 1000),
    CONSTRAINT chk_heli_zasieg     CHECK (zasieg_km BETWEEN 1 AND 1000),
    CONSTRAINT chk_heli_przeglad   CHECK (
        (status = 'aktywny' AND data_waznosci_przegladu IS NOT NULL)
        OR status = 'nieaktywny'
    )
);
COMMENT ON TABLE helikoptery IS 'Flota helikopterów';

-- Lądowiska
CREATE TABLE ladowiska (
    id          SERIAL           PRIMARY KEY,
    nazwa       VARCHAR(200)     NOT NULL UNIQUE,
    szerokosc   DOUBLE PRECISION NOT NULL,
    dlugosc     DOUBLE PRECISION NOT NULL,
    opis        TEXT,
    created_at  TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP        NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  ladowiska IS 'Lądowiska helikopterowe (współrzędne GPS)';
COMMENT ON COLUMN ladowiska.szerokosc IS 'Latitude (szerokość geograficzna)';
COMMENT ON COLUMN ladowiska.dlugosc   IS 'Longitude (długość geograficzna)';

-- Planowane operacje
CREATE TABLE planowane_operacje (
    id                          SERIAL       PRIMARY KEY,
    numer                       VARCHAR(30)  NOT NULL UNIQUE,
    numer_zlecenia_projektu     VARCHAR(30)  NOT NULL,
    opis_skrocony               VARCHAR(100) NOT NULL,
    kml_nazwa_pliku             TEXT,
    kml_zawartosc               TEXT,
    liczba_km_trasy             INTEGER      NOT NULL,
    proponowana_data_od         DATE,
    proponowana_data_do         DATE,
    planowana_data_od           DATE,
    planowana_data_do           DATE,
    dodatkowe_info              VARCHAR(500),
    komentarz                   VARCHAR(500),
    uwagi_po_realizacji         VARCHAR(500),
    status_id                   INTEGER      NOT NULL DEFAULT 1
                                             REFERENCES slownik_statusow_operacji(id),
    wprowadzajacy_id            INTEGER      NOT NULL
                                             REFERENCES uzytkownicy(id),
    created_at                  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP    NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  planowane_operacje IS 'Planowane operacje lotnicze – główna tabela biznesowa';
COMMENT ON COLUMN planowane_operacje.numer IS 'Numer automatyczny, np. OP-2026-0001';
COMMENT ON COLUMN planowane_operacje.kml_zawartosc IS 'Surowy XML/KML lub JSON trasy (do 5000 punktów)';

-- Punkty trasy operacji
CREATE TABLE operacja_punkty_trasy (
    id          SERIAL           PRIMARY KEY,
    operacja_id INTEGER          NOT NULL REFERENCES planowane_operacje(id) ON DELETE CASCADE,
    kolejnosc   INTEGER          NOT NULL,
    szerokosc   DOUBLE PRECISION NOT NULL,
    dlugosc     DOUBLE PRECISION NOT NULL,
    CONSTRAINT uq_operacja_kolejnosc UNIQUE (operacja_id, kolejnosc)
);
COMMENT ON TABLE operacja_punkty_trasy IS 'Punkty trasy GPS powiązane z operacją';

-- Rodzaje czynności w operacji (M:N)
CREATE TABLE operacja_rodzaje_czynnosci (
    operacja_id         INTEGER NOT NULL REFERENCES planowane_operacje(id) ON DELETE CASCADE,
    rodzaj_czynnosci_id INTEGER NOT NULL REFERENCES slownik_rodzajow_czynnosci(id),
    PRIMARY KEY (operacja_id, rodzaj_czynnosci_id)
);
COMMENT ON TABLE operacja_rodzaje_czynnosci IS 'Relacja M:N – operacje ↔ rodzaje czynności';

-- Osoby kontaktowe operacji (M:N)
CREATE TABLE operacja_osoby_kontaktowe (
    operacja_id   INTEGER NOT NULL REFERENCES planowane_operacje(id) ON DELETE CASCADE,
    uzytkownik_id INTEGER NOT NULL REFERENCES uzytkownicy(id),
    PRIMARY KEY (operacja_id, uzytkownik_id)
);
COMMENT ON TABLE operacja_osoby_kontaktowe IS 'Relacja M:N – operacje ↔ osoby kontaktowe';

-- Komentarze do operacji
CREATE TABLE operacja_komentarze (
    id          SERIAL       PRIMARY KEY,
    operacja_id INTEGER      NOT NULL REFERENCES planowane_operacje(id) ON DELETE CASCADE,
    tresc       VARCHAR(500) NOT NULL,
    autor_id    INTEGER      NOT NULL REFERENCES uzytkownicy(id),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE operacja_komentarze IS 'Komentarze / notatki przy operacjach';

-- Historia zmian operacji (audit log)
CREATE TABLE operacja_historia_zmian (
    id              SERIAL    PRIMARY KEY,
    operacja_id     INTEGER   NOT NULL REFERENCES planowane_operacje(id) ON DELETE CASCADE,
    pole            TEXT      NOT NULL,
    stara_wartosc   TEXT,
    nowa_wartosc    TEXT,
    zmieniony_przez INTEGER   NOT NULL REFERENCES uzytkownicy(id),
    data_zmiany     TIMESTAMP NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE operacja_historia_zmian IS 'Audit log zmian w planowanych operacjach';

-- Zlecenia na lot
CREATE TABLE zlecenia_na_lot (
    id                          SERIAL      PRIMARY KEY,
    numer                       VARCHAR(30) NOT NULL UNIQUE,
    planowany_start_dt          TIMESTAMP   NOT NULL,
    planowane_ladowanie_dt      TIMESTAMP   NOT NULL,
    rzeczywisty_start_dt        TIMESTAMP,
    rzeczywiste_ladowanie_dt    TIMESTAMP,
    pilot_id                    INTEGER     NOT NULL REFERENCES czlonkowie_zalogi(id),
    helikopter_id               INTEGER     NOT NULL REFERENCES helikoptery(id),
    ladowisko_startowe_id       INTEGER     NOT NULL REFERENCES ladowiska(id),
    ladowisko_koncowe_id        INTEGER     NOT NULL REFERENCES ladowiska(id),
    szacowana_dlugosc_trasy_km  INTEGER     NOT NULL,
    waga_zalogi_kg              INTEGER     NOT NULL,
    status_id                   INTEGER     NOT NULL DEFAULT 1
                                            REFERENCES slownik_statusow_zlecen(id),
    tworzacy_id                 INTEGER     NOT NULL REFERENCES uzytkownicy(id),
    created_at                  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP   NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  zlecenia_na_lot IS 'Zlecenia na lot helikoptera';
COMMENT ON COLUMN zlecenia_na_lot.numer IS 'Numer automatyczny, np. ZL-2026-0001';
COMMENT ON COLUMN zlecenia_na_lot.waga_zalogi_kg IS 'Obliczana automatycznie na podstawie członków załogi';

-- Członkowie załogi zlecenia (M:N)
CREATE TABLE zlecenie_czlonkowie_zalogi (
    zlecenie_id INTEGER NOT NULL REFERENCES zlecenia_na_lot(id) ON DELETE CASCADE,
    czlonek_id  INTEGER NOT NULL REFERENCES czlonkowie_zalogi(id),
    PRIMARY KEY (zlecenie_id, czlonek_id)
);
COMMENT ON TABLE zlecenie_czlonkowie_zalogi IS 'Relacja M:N – zlecenia ↔ członkowie załogi';

-- Operacje powiązane ze zleceniem (M:N)
CREATE TABLE zlecenie_operacje (
    zlecenie_id INTEGER NOT NULL REFERENCES zlecenia_na_lot(id) ON DELETE CASCADE,
    operacja_id INTEGER NOT NULL REFERENCES planowane_operacje(id),
    PRIMARY KEY (zlecenie_id, operacja_id)
);
COMMENT ON TABLE zlecenie_operacje IS 'Relacja M:N – zlecenia ↔ planowane operacje';

-- Historia zmian zlecenia (audit log)
CREATE TABLE zlecenie_historia_zmian (
    id              SERIAL    PRIMARY KEY,
    zlecenie_id     INTEGER   NOT NULL REFERENCES zlecenia_na_lot(id) ON DELETE CASCADE,
    pole            TEXT      NOT NULL,
    stara_wartosc   TEXT,
    nowa_wartosc    TEXT,
    zmieniony_przez INTEGER   NOT NULL REFERENCES uzytkownicy(id),
    data_zmiany     TIMESTAMP NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE zlecenie_historia_zmian IS 'Audit log zmian w zleceniach na lot';

-- ============================================================================
-- 5. INDEKSY
-- ============================================================================

CREATE INDEX        idx_uzytkownicy_email        ON uzytkownicy(email);
CREATE INDEX        idx_uzytkownicy_rola         ON uzytkownicy(rola_id);
CREATE UNIQUE INDEX idx_refresh_token_unique      ON refresh_tokens(token);
CREATE INDEX        idx_refresh_token_user        ON refresh_tokens(uzytkownik_id);
CREATE INDEX        idx_zaloga_email              ON czlonkowie_zalogi(email);
CREATE INDEX        idx_zaloga_rola               ON czlonkowie_zalogi(rola_id);
CREATE INDEX        idx_helikoptery_status        ON helikoptery(status);
CREATE INDEX        idx_operacje_status           ON planowane_operacje(status_id);
CREATE INDEX        idx_operacje_planowana_od     ON planowane_operacje(planowana_data_od);
CREATE INDEX        idx_operacje_wprowadzajacy    ON planowane_operacje(wprowadzajacy_id);
CREATE UNIQUE INDEX idx_operacje_numer_unique     ON planowane_operacje(numer);
CREATE INDEX        idx_operacja_punkty           ON operacja_punkty_trasy(operacja_id, kolejnosc);
CREATE INDEX        idx_zlecenia_status           ON zlecenia_na_lot(status_id);
CREATE INDEX        idx_zlecenia_helikopter       ON zlecenia_na_lot(helikopter_id);
CREATE INDEX        idx_zlecenia_pilot            ON zlecenia_na_lot(pilot_id);
CREATE INDEX        idx_zlecenia_start_dt         ON zlecenia_na_lot(planowany_start_dt);
CREATE UNIQUE INDEX idx_zlecenia_numer_unique     ON zlecenia_na_lot(numer);
CREATE INDEX        idx_zlec_oper_operacja        ON zlecenie_operacje(operacja_id);

-- ============================================================================
-- 6. FUNKCJA I TRIGGER: automatyczny updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_ustaw_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_ustaw_updated_at() IS 'Automatycznie ustawia updated_at = NOW() przy UPDATE';

DO $$
DECLARE
    _tbl TEXT;
BEGIN
    FOR _tbl IN
        SELECT unnest(ARRAY[
            'uzytkownicy',
            'czlonkowie_zalogi',
            'helikoptery',
            'ladowiska',
            'planowane_operacje',
            'zlecenia_na_lot'
        ])
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW
             EXECUTE FUNCTION fn_ustaw_updated_at();',
            _tbl, _tbl
        );
    END LOOP;
END;
$$;


-- ============================================================================
-- 7. MIGRACJA DANYCH
-- ============================================================================

-- 7.1 Słowniki

INSERT INTO slownik_rol_uzytkownikow (id, nazwa) VALUES
    (1, 'Administrator'),
    (2, 'Osoba planująca'),
    (3, 'Osoba nadzorująca'),
    (4, 'Pilot');

INSERT INTO slownik_rol_zalogi (id, nazwa) VALUES
    (1, 'Pilot'),
    (2, 'Obserwator');

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

INSERT INTO slownik_rodzajow_czynnosci (id, nazwa) VALUES
    (1, 'Oględziny wizualne'),
    (2, 'Skan 3D'),
    (3, 'Lokalizacja awarii'),
    (4, 'Zdjęcia'),
    (5, 'Patrolowanie');

-- 7.2 Użytkownicy

INSERT INTO uzytkownicy (id, imie, nazwisko, email, haslo_hash, rola_id, aktywny, created_at, updated_at) VALUES
    (2, 'Admin', 'Systemowy', 'admin@loty.pl', '$2a$12$3EufdnQLE7JNlcrBQGWXgetU5L8gJX812AJlv00w84S/WX1836GF.', 1, TRUE, '2026-03-23 08:23:36.9953586', '2026-03-23 08:23:36.9953588'),
    (3, 'Jan', 'Planujący', 'planujacy@loty.pl', '$2a$12$dSTCuvLUswVfDG2/WfSFneFpM3vX/boSkyWEfnTU10nLALdg9YECu', 2, TRUE, '2026-03-23 08:23:39.5873376', '2026-03-23 08:23:39.5873394'),
    (4, 'Maria', 'Nadzorująca', 'nadzorca@loty.pl', '$2a$12$V4RvO.Y3G6ocdHw/uy57iO1WEwVvVNBhTbxBknww8578vd53TlF4.', 3, TRUE, '2026-03-23 08:23:41.0592953', '2026-03-23 08:23:41.0592957'),
    (5, 'Tomasz', 'Pilot', 'pilot@loty.pl', '$2a$12$cPmyoiN5oVFGFFmIJ7YtS.OY4e00uhW3LGooeX9K9tc8ZeXUDKyWW', 4, TRUE, '2026-03-23 08:23:41.2780639', '2026-03-24 11:35:05.5542777'),
    (6, 'Jan', 'Testowy', 'jan.testowy@loty.pl', '$2a$12$BcJUM78gH/NkWsGdTtGAWuIfqLlACJtvmALnl65t0AxOC0NPh6ec6', 4, TRUE, '2026-03-31 10:37:55.8570647', '2026-03-31 10:37:55.8570647');

-- 7.3 Refresh tokens

INSERT INTO refresh_tokens (id, token, uzytkownik_id, utworzono_utc, wygasa_utc, odwolano_utc, zastapione_przez) VALUES
    (1, 'NQsLdgEIoZG8fGR/ujvfgqQHTWIDSEs0BvhrcoXzXNniQf4oPbaZT3uF8MjZSYSN7V3raRfoi01B4QcHrfg0wQ==', 5, '2026-03-30 05:35:24.935767', '2026-04-06 05:35:24.9358588', '2026-03-30 05:35:37.6188974', NULL),
    (2, 'o1VuBeEDiLrwQk/K5Ua3OmRN7yyrbtQX5TPgHlcrkm+JiY03ETGUkmyeb4/+/vY+tVEcUTGEeuvg17bu8RTL9w==', 2, '2026-03-30 05:36:36.8493569', '2026-04-06 05:36:36.8493573', NULL, NULL),
    (3, 'WSfaKw6rOhrdn0poLrwiF3rAR6/fNN413m3l3ETlsaZ8JsdD0eBtfpK5BSt10gaObtabTWitGu41xtxHKRQpng==', 2, '2026-03-31 09:45:10.299833', '2026-04-07 09:45:10.299988', NULL, NULL),
    (4, 'qI2lCzW57TTy+r9JKkzhAeFcYayYPzhcpMInjlHa1em3AtX/NMVTXM/Of9QVNtfKiLtijhPauksZzM92jBlB4w==', 3, '2026-03-31 09:48:16.1303391', '2026-04-07 09:48:16.1303395', NULL, NULL),
    (5, 'jvlz/Qg40brstJhV3RIUgq9hSF+egUJznypCqR6OP8ZlwqNEFPeTbvkgolq7oYjT+FIE3TCHeaWY4XOgiEb7Hg==', 4, '2026-03-31 09:54:14.2378888', '2026-04-07 09:54:14.2378892', NULL, NULL),
    (6, 'wo9cSN9orLmV9MqU918iDksMUDNXwsouaV5IcQ90ryugRlbapFK7XHotRdepl+MO8d8icXuRllkV62B43S4gXg==', 5, '2026-03-31 09:56:29.6127041', '2026-04-07 09:56:29.6127049', NULL, NULL),
    (7, 'CtqkaHJn2IbKMjkNsjSIDlloPz8CuEMsZU4aTbIFpa2qkkjjSqoPKdLxAjfsE7h3VoGE5yEQy72OPRy+MEfz8Q==', 4, '2026-03-31 10:03:05.9454983', '2026-04-07 10:03:05.9454988', NULL, NULL),
    (8, 'vCZtpa5Y3REJ2/78tVFeekx3fJjrazgU04H/V1215fxiGtfrv/5UaLpbUpzx1pZuTG8RX3/fkkwT/Fv8cnBq8g==', 5, '2026-03-31 10:03:36.2622585', '2026-04-07 10:03:36.262259', NULL, NULL),
    (9, 'YciDAqd8RCd5/Qy5wFLqTauuq/Vk6PDh6YPa760nIs/vZe7PAtzC66wsm5CcqVf3BHMjvtg4FmOyfsZ7hnKyxw==', 2, '2026-03-31 10:15:58.1073264', '2026-04-07 10:15:58.107327', NULL, NULL),
    (10, 'Ozvo/IXR+GUle6cxctr9uMRmux5W9K1j54UiopSaLTB+nrxl6GiJXySF/wYgG/yTcDiI+3TVYn6dg0LiOBEyyQ==', 2, '2026-03-31 10:23:31.8967447', '2026-04-07 10:23:31.8967456', '2026-03-31 11:00:24.3075138', 'cxzh4S2QjoIu8kFBHdsc48hsQm8cRAzEDrr3BD5RzG4wpmnWI43VXlFFruV8it7NUbpy4AtTMDhFpDSOTTkg4w=='),
    (11, '4qE+ZydjtGXRyEFomW6wyAvhTeCLuRJe95Nsv1H0oEpOJqgJvvYxeJ1izWevOHAIGmXUj6J+HEu7hxTtTBVl5w==', 6, '2026-03-31 10:54:32.3476971', '2026-04-07 10:54:32.3478623', '2026-03-31 10:54:38.6960814', NULL),
    (12, 'cbA+qfTrtStVrakrEm9pseVZ8R6goe/Ao9WgijBRX7tdZkkP0AM5yHodLKgFhHlO1f70TW7geCT1qBbuL9o+Zg==', 2, '2026-03-31 10:54:42.8276921', '2026-04-07 10:54:42.8276928', NULL, NULL),
    (13, 'cxzh4S2QjoIu8kFBHdsc48hsQm8cRAzEDrr3BD5RzG4wpmnWI43VXlFFruV8it7NUbpy4AtTMDhFpDSOTTkg4w==', 2, '2026-03-31 11:00:24.2901699', '2026-04-07 11:00:24.2901705', NULL, NULL);

-- 7.4 Członkowie załogi

INSERT INTO czlonkowie_zalogi (id, imie, nazwisko, email, waga_kg, rola_id, nr_licencji_pilota, data_waznosci_licencji, data_waznosci_szkolenia, aktywny, created_at, updated_at) VALUES
    (1, 'Jan', 'Nowak', 'jan.nowak@loty.pl', 85, 1, '121212121', '2026-03-01', '2026-03-01', TRUE, '2026-03-23 09:54:08.2850719', '2026-03-23 09:54:08.2850728'),
    (2, 'Piotr', 'kowalski', 'piotr.kowalski@loty.pl', 100, 2, NULL, NULL, '2026-03-01', TRUE, '2026-03-23 09:54:50.9174277', '2026-03-23 09:54:50.9174281'),
    (3, 'sdfsdfsd', 'asdasdasd', '122323@test.pl', 66, 2, NULL, NULL, '2026-03-28', TRUE, '2026-03-23 14:27:18.5842789', '2026-03-23 14:27:18.5842796'),
    (4, 'Tomasz', 'Pitot', 'pilot@loty.pl', 80, 1, '123222', '2030-03-01', '2032-03-01', TRUE, '2026-03-24 11:40:38.4697393', '2026-03-24 11:40:38.4697398');

-- 7.5 Helikoptery

INSERT INTO helikoptery (id, numer_rejestracyjny, typ, opis, maks_liczba_czlonkow_zalogi, maks_udzwig_kg, zasieg_km, status, data_waznosci_przegladu, created_at, updated_at) VALUES
    (1, 'Sp-HXY', 'Airbus 125', 'Airbus 125', 2, 500, 500, 'aktywny', '2028-03-01', '2026-03-23 09:53:15.5068299', '2026-03-23 10:11:47.8270725');

-- 7.6 Lądowiska

INSERT INTO ladowiska (id, nazwa, szerokosc, dlugosc, opis, created_at, updated_at) VALUES
    (1, 'Wrocław', 51.102778, 16.885833, 'Wrocław lotnisko', '2026-03-23 09:59:16.8589392', '2026-03-23 09:59:16.8589394'),
    (2, 'Kraków', 50.0725, 19.805833, 'Kraków lotnisko', '2026-03-23 10:00:56.1820132', '2026-03-23 10:01:35.298078'),
    (3, 'Białystok', 53.101185, 23.159866, 'Białystok lotnisk', '2026-03-29 06:15:45.7195015', '2026-03-29 06:15:45.7195021'),
    (4, 'Legnica', 51.21639, 16.12382, 'Lotnisko w Legnicy', '2026-03-31 10:39:45.6343248', '2026-03-31 10:39:45.6343251');

-- 7.7 Planowane operacje

INSERT INTO planowane_operacje (id, numer, numer_zlecenia_projektu, opis_skrocony, kml_nazwa_pliku, kml_zawartosc, liczba_km_trasy, proponowana_data_od, proponowana_data_do, planowana_data_od, planowana_data_do, dodatkowe_info, komentarz, uwagi_po_realizacji, status_id, wprowadzajacy_id, created_at, updated_at) VALUES
    (1, 'OP-2026-0001', 'DE-25-111', 'Lot z Wrocławia do Krakowa', 'test.kml', NULL, 234, '2026-03-03', '2026-03-31', '2026-03-17', '2026-03-31', 'brak', 'brak', NULL, 6, 2, '2026-03-24 08:23:55.5377216', '2026-03-24 11:30:57.7412162');

INSERT INTO planowane_operacje (id, numer, numer_zlecenia_projektu, opis_skrocony, kml_nazwa_pliku, kml_zawartosc, liczba_km_trasy, proponowana_data_od, proponowana_data_do, planowana_data_od, planowana_data_do, dodatkowe_info, komentarz, uwagi_po_realizacji, status_id, wprowadzajacy_id, created_at, updated_at) VALUES
    (2, 'OP-2026-0002', 'DE-25-111', 'Lot z Wrocławia do Krakowa II', 'trasa_2026-03-28.json', E'{\n  "version": "1.0",\n  "app": "LotyAdmin – Trasy lotów",\n  "created": "2026-03-28T14:43:25.435Z",\n  "count": 5,\n  "totalDistanceKm": 502.229,\n  "points": [\n    {\n      "id": 1,\n      "lat": 51.104112,\n      "lng": 17.051468\n    },\n    {\n      "id": 2,\n      "lat": 50.266848,\n      "lng": 19.083938\n    },\n    {\n      "id": 3,\n      "lat": 50.064795,\n      "lng": 19.940872\n    },\n    {\n      "id": 4,\n      "lat": 51.406646,\n      "lng": 21.149368\n    },\n    {\n      "id": 5,\n      "lat": 52.255284,\n      "lng": 21.039505\n    }\n  ]\n}', 502, '2026-03-04', '2026-03-28', '2026-04-01', '2026-04-01', 'eeee', 'potwierdzam', NULL, 3, 2, '2026-03-24 09:32:54.5276494', '2026-03-29 06:46:15.2007302');

INSERT INTO planowane_operacje (id, numer, numer_zlecenia_projektu, opis_skrocony, kml_nazwa_pliku, kml_zawartosc, liczba_km_trasy, proponowana_data_od, proponowana_data_do, planowana_data_od, planowana_data_do, dodatkowe_info, komentarz, uwagi_po_realizacji, status_id, wprowadzajacy_id, created_at, updated_at) VALUES
    (3, 'OP-2026-0003', 'DE-25-111', 'Lot z Wrocławia do Krakowa', 'trasa_2.json', E'{\n  "version": "1.0",\n  "app": "LotyAdmin – Trasy lotów",\n  "created": "2026-03-28T15:50:32.244Z",\n  "count": 4,\n  "totalDistanceKm": 101.456,\n  "points": [\n    {\n      "id": 1,\n      "lat": 52.180423,\n      "lng": 20.764846\n    },\n    {\n      "id": 2,\n      "lat": 52.428141,\n      "lng": 20.690689\n    },\n    {\n      "id": 3,\n      "lat": 52.225872,\n      "lng": 20.259475\n    },\n    {\n      "id": 4,\n      "lat": 52.163578,\n      "lng": 20.785446\n    }\n  ]\n}', 101, '2026-03-01', '2026-03-31', NULL, NULL, 'brak', NULL, NULL, 1, 4, '2026-03-24 10:05:00.8712388', '2026-03-29 04:50:28.191242');

INSERT INTO planowane_operacje (id, numer, numer_zlecenia_projektu, opis_skrocony, kml_nazwa_pliku, kml_zawartosc, liczba_km_trasy, proponowana_data_od, proponowana_data_do, planowana_data_od, planowana_data_do, dodatkowe_info, komentarz, uwagi_po_realizacji, status_id, wprowadzajacy_id, created_at, updated_at) VALUES
    (4, 'OP-2026-0004', 'DE-03-2005', 'test lotu do Gdańska', 'trasa_3.json', E'{\n  "version": "1.0",\n  "app": "LotyAdmin – Trasy lotów",\n  "created": "2026-03-29T04:54:21.794Z",\n  "count": 6,\n  "totalDistanceKm": 633.28,\n  "points": [\n    {\n      "id": 1,\n      "lat": 51.101546,\n      "lng": 16.886673\n    },\n    {\n      "id": 2,\n      "lat": 51.298602,\n      "lng": 18.140487\n    },\n    {\n      "id": 3,\n      "lat": 52.237627,\n      "lng": 20.968094\n    },\n    {\n      "id": 4,\n      "lat": 53.771187,\n      "lng": 20.506668\n    },\n    {\n      "id": 5,\n      "lat": 54.171828,\n      "lng": 19.397049\n    },\n    {\n      "id": 6,\n      "lat": 54.37644,\n      "lng": 18.476257\n    }\n  ]\n}', 633, '2026-04-01', '2026-04-01', NULL, NULL, 'bez', NULL, NULL, 1, 2, '2026-03-29 04:53:09.8577501', '2026-03-29 04:55:29.3472331');

INSERT INTO planowane_operacje (id, numer, numer_zlecenia_projektu, opis_skrocony, kml_nazwa_pliku, kml_zawartosc, liczba_km_trasy, proponowana_data_od, proponowana_data_do, planowana_data_od, planowana_data_do, dodatkowe_info, komentarz, uwagi_po_realizacji, status_id, wprowadzajacy_id, created_at, updated_at) VALUES
    (5, 'OP-2026-0005', 'DE-05-2026', 'Lot z Wrocławia do Białegostoku', 'trasa_4.json', E'{\n  "version": "1.0",\n  "app": "LotyAdmin – Trasy lotów",\n  "created": "2026-03-29T05:51:19.399Z",\n  "count": 4,\n  "totalDistanceKm": 782.157,\n  "points": [\n    {\n      "id": 1,\n      "lat": 51.105608,\n      "lng": 16.974563\n    },\n    {\n      "id": 2,\n      "lat": 51.759205,\n      "lng": 19.457473\n    },\n    {\n      "id": 3,\n      "lat": 50.062288,\n      "lng": 19.973831\n    },\n    {\n      "id": 4,\n      "lat": 53.101185,\n      "lng": 23.159866\n    }\n  ]\n}', 782, '2026-04-02', '2026-04-02', '2026-04-02', '2026-04-02', 'brak', 'potwierdzam plan', NULL, 5, 3, '2026-03-29 06:11:13.432629', '2026-03-29 06:13:49.7946849');

INSERT INTO planowane_operacje (id, numer, numer_zlecenia_projektu, opis_skrocony, kml_nazwa_pliku, kml_zawartosc, liczba_km_trasy, proponowana_data_od, proponowana_data_do, planowana_data_od, planowana_data_do, dodatkowe_info, komentarz, uwagi_po_realizacji, status_id, wprowadzajacy_id, created_at, updated_at) VALUES
    (6, 'OP-2026-0006', 'DE33 WRO LG', 'Trasa Wrocaw Legnica linia 220KV', 'trasa_wroclawlegnica.json', E'{\n  "version": "1.0",\n  "app": "LotyAdmin – Trasy lotów",\n  "created": "2026-03-31T09:49:33.992Z",\n  "count": 13,\n  "totalDistanceKm": 58.726,\n  "points": [\n    {\n      "id": 1,\n      "lat": 51.101845,\n      "lng": 16.883245\n    },\n    {\n      "id": 2,\n      "lat": 51.090634,\n      "lng": 16.804967\n    },\n    {\n      "id": 3,\n      "lat": 51.086321,\n      "lng": 16.740422\n    },\n    {\n      "id": 4,\n      "lat": 51.094946,\n      "lng": 16.660772\n    },\n    {\n      "id": 5,\n      "lat": 51.107881,\n      "lng": 16.590734\n    },\n    {\n      "id": 6,\n      "lat": 51.144942,\n      "lng": 16.552282\n    },\n    {\n      "id": 7,\n      "lat": 51.172503,\n      "lng": 16.515203\n    },\n    {\n      "id": 8,\n      "lat": 51.174225,\n      "lng": 16.454778\n    },\n    {\n      "id": 9,\n      "lat": 51.175086,\n      "lng": 16.391607\n    },\n    {\n      "id": 10,\n      "lat": 51.179391,\n      "lng": 16.300969\n    },\n    {\n      "id": 11,\n      "lat": 51.176808,\n      "lng": 16.225438\n    },\n    {\n      "id": 12,\n      "lat": 51.185417,\n      "lng": 16.170507\n    },\n    {\n      "id": 13,\n      "lat": 51.216395,\n      "lng": 16.123815\n    }\n  ]\n}', 59, '2026-04-05', '2026-04-05', '2026-04-05', '2026-04-05', 'brak informacji dodatkowych ', 'potwierdzamy lot ', NULL, 6, 3, '2026-03-31 09:52:13.298025', '2026-03-31 09:55:37.7139651');

-- 7.8 Operacja – rodzaje czynności (M:N)

INSERT INTO operacja_rodzaje_czynnosci (operacja_id, rodzaj_czynnosci_id) VALUES
    (1, 1),
    (1, 2),
    (2, 2),
    (2, 4),
    (3, 2),
    (3, 3),
    (4, 3),
    (4, 4),
    (5, 3),
    (5, 4),
    (6, 2),
    (6, 4);

-- 7.9 Operacja – osoby kontaktowe (M:N)

INSERT INTO operacja_osoby_kontaktowe (operacja_id, uzytkownik_id) VALUES
    (1, 3),
    (1, 5),
    (2, 5),
    (4, 5),
    (5, 5),
    (6, 5);

-- 7.10 Operacja – komentarze

INSERT INTO operacja_komentarze (id, operacja_id, tresc, autor_id, created_at) VALUES
    (1, 1, 'wwww', 3, '2026-03-24 09:36:01.3479998'),
    (2, 1, 'potwierdzone do lotu', 4, '2026-03-24 09:38:57.1073209'),
    (3, 1, 'ok', 5, '2026-03-24 09:40:03.8593391'),
    (4, 4, 'brak', 5, '2026-03-29 05:01:34.8153822'),
    (5, 5, 'ggg', 4, '2026-03-29 06:31:05.6699502');

-- 7.11 Operacja – historia zmian (audit log)

INSERT INTO operacja_historia_zmian (id, operacja_id, pole, stara_wartosc, nowa_wartosc, zmieniony_przez, data_zmiany) VALUES
    (1, 1, 'status', NULL, '1', 2, '2026-03-24 08:23:55.6737042'),
    (2, 2, 'status', NULL, '1', 2, '2026-03-24 09:32:54.9554865'),
    (3, 1, 'planowana_data_od', NULL, '17.03.2026', 4, '2026-03-24 09:38:24.1597693'),
    (4, 1, 'planowana_data_do', NULL, '31.03.2026', 4, '2026-03-24 09:38:24.1611512'),
    (5, 1, 'status', '1', '3', 4, '2026-03-24 09:38:42.6436245'),
    (6, 3, 'status', NULL, '1', 4, '2026-03-24 10:05:00.8899797'),
    (7, 1, 'status', '3', '4', 5, '2026-03-24 11:42:14.6474002'),
    (8, 4, 'status', NULL, '1', 2, '2026-03-29 04:53:09.9866984'),
    (9, 1, 'status', '4', '6', 5, '2026-03-29 05:48:58.0960836'),
    (10, 5, 'status', NULL, '1', 3, '2026-03-29 06:11:13.990381'),
    (11, 5, 'planowana_data_od', NULL, '2.04.2026', 4, '2026-03-29 06:13:21.1568967'),
    (12, 5, 'planowana_data_do', NULL, '2.04.2026', 4, '2026-03-29 06:13:21.1587816'),
    (13, 5, 'status', '1', '3', 4, '2026-03-29 06:13:49.7944531'),
    (14, 5, 'status', '3', '4', 5, '2026-03-29 06:18:57.7701188'),
    (15, 2, 'planowana_data_od', NULL, '1.04.2026', 4, '2026-03-29 06:45:58.8721899'),
    (16, 2, 'planowana_data_do', NULL, '1.04.2026', 4, '2026-03-29 06:45:58.9280136'),
    (17, 2, 'status', '1', '3', 4, '2026-03-29 06:46:15.2001901'),
    (18, 5, 'status', '4', '5', 5, '2026-03-29 06:49:41.1606205'),
    (19, 6, 'status', NULL, '1', 3, '2026-03-31 09:52:13.4809315'),
    (20, 6, 'planowana_data_od', NULL, '4/5/2026', 4, '2026-03-31 09:55:09.9945009'),
    (21, 6, 'planowana_data_do', NULL, '4/5/2026', 4, '2026-03-31 09:55:09.9954353'),
    (22, 6, 'status', '1', '3', 4, '2026-03-31 09:55:37.7135809'),
    (23, 6, 'status', '3', '4', 5, '2026-03-31 09:58:12.7810783'),
    (24, 6, 'status', '4', '6', 5, '2026-03-31 10:05:01.3734916');

-- 7.12 Zlecenia na lot

INSERT INTO zlecenia_na_lot (id, numer, planowany_start_dt, planowane_ladowanie_dt, rzeczywisty_start_dt, rzeczywiste_ladowanie_dt, pilot_id, helikopter_id, ladowisko_startowe_id, ladowisko_koncowe_id, szacowana_dlugosc_trasy_km, waga_zalogi_kg, status_id, tworzacy_id, created_at, updated_at) VALUES
    (1, 'ZL-2026-0001', '2026-03-28 04:00:00', '2026-03-28 05:00:00', '2026-03-28 05:00:00', '2026-03-28 08:00:00', 4, 1, 1, 2, 245, 160, 6, 5, '2026-03-24 11:42:14.5745013', '2026-03-29 05:48:58.0907551'),
    (2, 'ZL-2026-0002', '2026-04-02 02:00:00', '2026-04-02 04:00:00', '2026-04-02 06:00:00', '2026-04-02 08:00:00', 4, 1, 1, 3, 499, 160, 5, 5, '2026-03-29 06:18:57.6797593', '2026-03-29 06:49:41.156042'),
    (3, 'ZL-2026-0003', '2026-04-05 06:00:00', '2026-04-05 18:00:00', '2026-04-05 08:00:00', '2026-04-05 13:00:00', 4, 1, 1, 1, 60, 160, 6, 5, '2026-03-31 09:58:12.7203328', '2026-03-31 10:05:01.3723994');

-- 7.13 Zlecenie – członkowie załogi (M:N)

INSERT INTO zlecenie_czlonkowie_zalogi (zlecenie_id, czlonek_id) VALUES
    (1, 4),
    (2, 4),
    (3, 4);

-- 7.14 Zlecenie – operacje (M:N)

INSERT INTO zlecenie_operacje (zlecenie_id, operacja_id) VALUES
    (1, 1),
    (2, 5),
    (3, 6);

-- 7.15 Zlecenie – historia zmian (audit log)

INSERT INTO zlecenie_historia_zmian (id, zlecenie_id, pole, stara_wartosc, nowa_wartosc, zmieniony_przez, data_zmiany) VALUES
    (1, 1, 'status', '1', '2', 5, '2026-03-24 11:42:40.0126087'),
    (2, 1, 'status', '2', '4', 4, '2026-03-29 05:43:59.1221291'),
    (3, 1, 'status', '4', '6', 5, '2026-03-29 05:48:58.0886377'),
    (4, 2, 'status', '1', '2', 5, '2026-03-29 06:47:21.3140605'),
    (5, 2, 'status', '2', '4', 4, '2026-03-29 06:48:11.7059387'),
    (6, 2, 'status', '4', '5', 5, '2026-03-29 06:49:41.1557851'),
    (7, 3, 'status', '1', '2', 5, '2026-03-31 09:58:27.1433264'),
    (8, 3, 'status', '2', '4', 4, '2026-03-31 10:03:25.5473201'),
    (9, 3, 'status', '4', '6', 5, '2026-03-31 10:05:01.3722489');


-- ============================================================================
-- 8. SYNCHRONIZACJA SEKWENCJI (SERIAL)
-- ============================================================================

SELECT setval('slownik_rol_uzytkownikow_id_seq',   (SELECT COALESCE(MAX(id), 1) FROM slownik_rol_uzytkownikow));
SELECT setval('slownik_rol_zalogi_id_seq',          (SELECT COALESCE(MAX(id), 1) FROM slownik_rol_zalogi));
SELECT setval('slownik_rodzajow_czynnosci_id_seq',  (SELECT COALESCE(MAX(id), 1) FROM slownik_rodzajow_czynnosci));
SELECT setval('uzytkownicy_id_seq',                 (SELECT COALESCE(MAX(id), 1) FROM uzytkownicy));
SELECT setval('refresh_tokens_id_seq',              (SELECT COALESCE(MAX(id), 1) FROM refresh_tokens));
SELECT setval('czlonkowie_zalogi_id_seq',           (SELECT COALESCE(MAX(id), 1) FROM czlonkowie_zalogi));
SELECT setval('helikoptery_id_seq',                 (SELECT COALESCE(MAX(id), 1) FROM helikoptery));
SELECT setval('ladowiska_id_seq',                   (SELECT COALESCE(MAX(id), 1) FROM ladowiska));
SELECT setval('planowane_operacje_id_seq',          (SELECT COALESCE(MAX(id), 1) FROM planowane_operacje));
SELECT setval('operacja_punkty_trasy_id_seq',       (SELECT COALESCE(MAX(id), 1) FROM operacja_punkty_trasy));
SELECT setval('operacja_komentarze_id_seq',         (SELECT COALESCE(MAX(id), 1) FROM operacja_komentarze));
SELECT setval('operacja_historia_zmian_id_seq',     (SELECT COALESCE(MAX(id), 1) FROM operacja_historia_zmian));
SELECT setval('zlecenia_na_lot_id_seq',             (SELECT COALESCE(MAX(id), 1) FROM zlecenia_na_lot));
SELECT setval('zlecenie_historia_zmian_id_seq',     (SELECT COALESCE(MAX(id), 1) FROM zlecenie_historia_zmian));

-- ============================================================================
-- 9. WERYFIKACJA MIGRACJI
-- ============================================================================

DO $$
DECLARE
    _cnt BIGINT;
    _tbl TEXT;
    _expected BIGINT;
BEGIN
    FOR _tbl, _expected IN
        SELECT * FROM (VALUES
            ('slownik_rol_uzytkownikow', 4::BIGINT),
            ('slownik_rol_zalogi', 2::BIGINT),
            ('slownik_statusow_operacji', 7::BIGINT),
            ('slownik_statusow_zlecen', 7::BIGINT),
            ('slownik_rodzajow_czynnosci', 5::BIGINT),
            ('uzytkownicy', 5::BIGINT),
            ('refresh_tokens', 13::BIGINT),
            ('czlonkowie_zalogi', 4::BIGINT),
            ('helikoptery', 1::BIGINT),
            ('ladowiska', 4::BIGINT),
            ('planowane_operacje', 6::BIGINT),
            ('operacja_rodzaje_czynnosci', 12::BIGINT),
            ('operacja_osoby_kontaktowe', 6::BIGINT),
            ('operacja_komentarze', 5::BIGINT),
            ('operacja_historia_zmian', 24::BIGINT),
            ('operacja_punkty_trasy', 0::BIGINT),
            ('zlecenia_na_lot', 3::BIGINT),
            ('zlecenie_czlonkowie_zalogi', 3::BIGINT),
            ('zlecenie_operacje', 3::BIGINT),
            ('zlecenie_historia_zmian', 9::BIGINT)
        ) AS t(tbl, cnt)
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', _tbl) INTO _cnt;
        IF _cnt <> _expected THEN
            RAISE EXCEPTION 'BŁĄD WERYFIKACJI: % – oczekiwano % wierszy, znaleziono %', _tbl, _expected, _cnt;
        END IF;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACJA ZAKOŃCZONA POMYŚLNIE';
    RAISE NOTICE '20 tabel, 18 indeksów, 6 triggerów';
    RAISE NOTICE 'Wszystkie asercje danych przeszły OK';
    RAISE NOTICE '========================================';
END;
$$;

COMMIT;
