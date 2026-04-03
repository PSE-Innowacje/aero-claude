# Dokumentacja Techniczna — LotyAdmin

## 1. Wprowadzenie

Niniejszy dokument zawiera szczegółową dokumentację techniczną systemu LotyAdmin — aplikacji webowej do ewidencji planowanych operacji lotniczych oraz przygotowania zleceń na lot helikopterem.

Dokument jest skierowany do deweloperów, administratorów systemu oraz osób odpowiedzialnych za utrzymanie i rozwój aplikacji.

---

## 2. Architektura systemu

### 2.1 Przegląd

System realizuje architekturę klient–serwer z następującymi komponentami:

- **Frontend (SPA)** — aplikacja React uruchamiana w przeglądarce, komunikuje się z backendem wyłącznie przez REST API.
- **Backend (API)** — serwer ASP.NET Core 8 udostępniający REST API, obsługujący logikę biznesową i dostęp do danych.
- **Baza danych** — SQLite (plik `loty.db`) zarządzany przez Entity Framework Core.

Architektura backendu opiera się na wzorcu warstwowym:

```
Controller → Service → DbContext (EF Core) → SQLite
     ↑           ↑
  Validator    StatusMachine
```

Kontrolery odpowiadają za routing HTTP i autoryzację. Serwisy implementują logikę biznesową. Maszyna stanów (`StatusMachine`) centralizuje reguły przejść statusów. Walidatory (`FluentValidation`) weryfikują dane wejściowe.

### 2.2 Wzorce projektowe

- **Dependency Injection** — wszystkie serwisy rejestrowane jako `Scoped` w kontenerze DI.
- **Repository Pattern** (implicit) — Entity Framework Core pełni rolę repozytorium.
- **DTO Pattern** — dedykowane obiekty transferu danych oddzielają encje od API.
- **State Machine** — scentralizowana maszyna stanów (`StatusMachine.cs`) definiuje dozwolone przejścia statusów dla każdej roli.
- **Interceptor Pattern** (frontend) — Axios interceptory automatycznie dołączają tokeny i obsługują refresh.

---

## 3. Baza danych

### 3.1 Silnik

SQLite — plikowa baza relacyjna. Plik bazy: `loty.db`. Konfiguracja: PRAGMA `foreign_keys = ON`, `journal_mode = WAL`.

### 3.2 Schemat tabel

#### Tabele słownikowe

| Tabela | Opis | Dane inicjalne |
|--------|------|----------------|
| `slownik_rol_uzytkownikow` | Role użytkowników systemu | Administrator, Osoba planująca, Osoba nadzorująca, Pilot |
| `slownik_rol_zalogi` | Role członków załogi | Pilot, Obserwator |
| `slownik_rodzajow_czynnosci` | Rodzaje czynności lotniczych | Oględziny wizualne, Skan 3D, Lokalizacja awarii, Zdjęcia, Patrolowanie |
| `slownik_statusow_operacji` | Statusy planowanych operacji | 1–7 (Wprowadzone → Rezygnacja) |
| `slownik_statusow_zlecen` | Statusy zleceń na lot | 1–7 (Wprowadzone → Nie zrealizowane) |

#### Tabele administracyjne

| Tabela | Klucz główny | Unikalność | Opis |
|--------|:---:|------------|------|
| `uzytkownicy` | `id` (auto) | `email` | Konta użytkowników (login, hasło BCrypt, rola) |
| `helikoptery` | `id` (auto) | `numer_rejestracyjny` | Rejestr floty helikopterów |
| `czlonkowie_zalogi` | `id` (auto) | `email` | Personel lotniczy (piloci, obserwatorzy) |
| `ladowiska` | `id` (auto) | `nazwa` | Lądowiska planowe ze współrzędnymi |

#### Tabele operacji lotniczych

| Tabela | Opis |
|--------|------|
| `planowane_operacje` | Główna tabela planowanych operacji lotniczych |
| `operacja_punkty_trasy` | Punkty GPS trasy (z KML), FK → `planowane_operacje` |
| `operacja_rodzaje_czynnosci` | Relacja N:M — operacja ↔ rodzaj czynności |
| `operacja_osoby_kontaktowe` | Relacja N:M — operacja ↔ użytkownik (kontakt) |
| `operacja_komentarze` | Komentarze chronologiczne do operacji |
| `operacja_historia_zmian` | Audyt zmian statusów i dat |

#### Tabele zleceń na lot

| Tabela | Opis |
|--------|------|
| `zlecenia_na_lot` | Główna tabela zleceń na lot |
| `zlecenie_czlonkowie_zalogi` | Relacja N:M — zlecenie ↔ członek załogi (dodatkowi) |
| `zlecenie_operacje` | Relacja N:M — zlecenie ↔ planowana operacja |
| `zlecenie_historia_zmian` | Audyt zmian statusów zlecenia |

#### Tabele pomocnicze

| Tabela | Opis |
|--------|------|
| `numeratory` | Sekwencyjne numery (prefix + rok → ostatnia wartość) |
| `refresh_tokens` | Tokeny odświeżające z datą wygaśnięcia |

### 3.3 Indeksy

Baza zawiera indeksy na kolumnach najczęściej używanych w filtrach i JOIN-ach: `email` (użytkownicy, załoga), `status` (helikoptery), `status_id` (operacje, zlecenia), `planowana_data_od` (operacje), `pilot_id` / `helikopter_id` (zlecenia), `planowany_start_dt` (zlecenia), oraz klucze obce w tabelach relacyjnych.

### 3.4 Autonumeracja

System generuje unikalne numery operacji i zleceń w formacie `{PREFIX}-{ROK}-{NNN}`:

- Operacje: `OP-2026-001`, `OP-2026-002`, ...
- Zlecenia: `ZL-2026-001`, `ZL-2026-002`, ...

Implementacja w `NumeratorService.cs` używa tabeli `numeratory` z kluczem złożonym `(prefix, rok)`. Przy starcie aplikacji numeratory są synchronizowane z istniejącymi danymi w tabelach docelowych.

---

## 4. Backend API — szczegóły implementacji

### 4.1 Konfiguracja aplikacji (`Program.cs`)

Kolejność konfiguracji middleware pipeline:

1. Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
2. Exception Handling Middleware
3. Serilog Request Logging
4. Swagger UI (tylko Development)
5. CORS
6. Rate Limiter
7. Authentication (JWT Bearer)
8. Authorization
9. Controllers
10. Health Check (`/health`)

#### Limity

- Maksymalny rozmiar żądania: 5 MB (Kestrel)
- Rate limiting logowania: 5 prób / 1 minuta (Fixed Window)

### 4.2 Uwierzytelnianie i autoryzacja

#### JWT Token Flow

1. Użytkownik wysyła `POST /api/auth/login` z emailem i hasłem.
2. Serwer weryfikuje hasło (BCrypt), generuje access token (JWT, 30 min) i refresh token (losowy, 7 dni).
3. Access token zawiera claims: `sub` (userId), `email`, `role` (nazwa roli).
4. Refresh token zapisywany jest w bazie danych (`refresh_tokens`).
5. Przy wygaśnięciu access tokenu frontend automatycznie wywołuje `POST /api/auth/refresh` z rotacją refresh tokenu.
6. Wylogowanie (`POST /api/auth/logout`) unieważnia refresh token.

#### Globalny filtr autoryzacji

Wszystkie endpointy wymagają uwierzytelnienia (`[AuthorizeFilter]` globalnie). Endpointy publiczne oznaczone `[AllowAnonymous]`: login, refresh, health check.

#### Grupy ról

Zdefiniowane w `Roles.cs` jako stałe łańcuchowe do użycia w `[Authorize(Roles = ...)]`:

- `PlanowanieGroup` = Administrator, Osoba planująca, Osoba nadzorująca
- `ZleceniaGroup` = Administrator, Pilot, Osoba nadzorująca
- `PilotGroup` = Administrator, Pilot

#### Czyszczenie tokenów

`RefreshTokenCleanupService` — hosted service działający w tle, cyklicznie (co 6h) usuwa wygasłe refresh tokeny z bazy danych.

### 4.3 Maszyna stanów (`StatusMachine.cs`)

Centralne źródło prawdy o dozwolonych przejściach statusów. Administrator może wykonać dowolne przejście.

#### Przejścia statusów operacji

| Rola | Z statusu | Na status |
|------|-----------|-----------|
| Osoba nadzorująca | 1 (Wprowadzone) | 2 (Odrzucone) |
| Osoba nadzorująca | 1 (Wprowadzone) | 3 (Potwierdzone do planu) |
| Osoba planująca | 1 (Wprowadzone) | 7 (Rezygnacja) |
| Osoba planująca | 3 (Potwierdzone do planu) | 7 (Rezygnacja) |
| Osoba planująca | 4 (Zaplanowane do zlecenia) | 7 (Rezygnacja) |
| System (automatycznie) | 3 → 4 | Po dodaniu do zlecenia |
| System (automatycznie) | 4 → 5 | Zlecenie zrealizowane w części |
| System (automatycznie) | 4 → 6 | Zlecenie zrealizowane w całości |
| System (automatycznie) | 4 → 3 | Zlecenie nie zrealizowane |

#### Przejścia statusów zleceń

| Rola | Z statusu | Na status |
|------|-----------|-----------|
| Pilot | 1 (Wprowadzone) | 2 (Przekazane do akceptacji) |
| Pilot | 4 (Zaakceptowane) | 5 (Zrealizowane w części) |
| Pilot | 4 (Zaakceptowane) | 6 (Zrealizowane w całości) |
| Pilot | 4 (Zaakceptowane) | 7 (Nie zrealizowane) |
| Osoba nadzorująca | 2 (Przekazane do akceptacji) | 3 (Odrzucone) |
| Osoba nadzorująca | 2 (Przekazane do akceptacji) | 4 (Zaakceptowane) |

#### Kaskadowa zmiana statusów

Zmiana statusu zlecenia automatycznie aktualizuje statusy powiązanych operacji lotniczych:

- Zlecenie → 5 (Zrealizowane w części) ⇒ Operacje (status 4) → 5 (Częściowo zrealizowane)
- Zlecenie → 6 (Zrealizowane w całości) ⇒ Operacje (status 4) → 6 (Zrealizowane)
- Zlecenie → 7 (Nie zrealizowane) ⇒ Operacje (status 4) → 3 (Potwierdzone do planu)

#### Uprawnienia do edycji

Osoba planująca może edytować operację w statusach: 1, 2, 3, 4, 5. Osoba nadzorująca i Administrator — we wszystkich. Pilot może edytować zlecenie w statusach: 1 (Wprowadzone), 3 (Odrzucone), 4 (Zaakceptowane).

### 4.4 Walidacje

#### Walidacja FluentValidation (warstwa DTO)

Walidatory zarejestrowane automatycznie z assembly (`AddValidatorsFromAssemblyContaining`). Wspólne reguły wyodrębnione jako extension methods (`ValidatorExtensions`).

Kluczowe reguły walidacji:

- **Hasło** — min. 8 znaków, wielka litera, mała litera, cyfra, znak specjalny.
- **Email** — format RFC 5322 (FluentValidation `EmailAddress()`).
- **Helikopter** — udźwig 1–1000 kg, zasięg 1–1000 km, załoga 1–10, data przeglądu wymagana dla statusu aktywny.
- **Członek załogi** — waga 30–200 kg, licencja i data ważności wymagane dla roli Pilot.
- **Operacja** — min. 1 rodzaj czynności, punkty trasy w zakresie (-90,90) × (-180,180), spójność dat.
- **Zlecenie** — start w przyszłości, lądowanie po starcie, min. 1 operacja, spójność czasów rzeczywistych.

#### Walidacje biznesowe (warstwa Service)

Zlecenie na lot podlega dodatkowym walidacjom przy zapisie:

1. **Przegląd helikoptera** — data ważności przeglądu musi obejmować dzień planowanego lotu.
2. **Licencja pilota** — data ważności licencji musi obejmować dzień planowanego lotu.
3. **Szkolenie załogi** — data ważności szkolenia każdego członka załogi musi obejmować dzień lotu.
4. **Udźwig** — suma wag pilota i członków załogi nie może przekraczać maksymalnego udźwigu helikoptera.
5. **Zasięg** — szacowana długość trasy nie może przekraczać zasięgu helikoptera bez lądowania.

Każda z tych walidacji blokuje zapis zlecenia i zwraca stosowny komunikat błędu.

### 4.5 Ustandaryzowane odpowiedzi API

Wszystkie odpowiedzi API zwracane są w formacie `ApiResult<T>`:

```json
{
  "success": true,
  "data": { ... }
}
```

W przypadku błędu:

```json
{
  "success": false,
  "errors": ["Komunikat błędu 1", "Komunikat błędu 2"]
}
```

Listy stronicowane zwracane są jako `PagedResult<T>`:

```json
{
  "items": [...],
  "strona": 1,
  "rozmiarStrony": 20,
  "lacznaLiczba": 47,
  "lacznaLiczbaStron": 3,
  "maPoprzednia": false,
  "maNastepna": true
}
```

### 4.6 Logowanie

Serilog z dwoma sinkami:

- **Console** — skrócony format `[HH:mm:ss LVL] Source: Message`
- **File** — pliki rotowane dziennie w katalogu `logs/`, format z pełnym timestampem, retencja 14 dni.

Request logging: `HTTP {Method} {Path} → {StatusCode} ({Elapsed}ms)`.

### 4.7 Obsługa błędów

`ExceptionHandlingMiddleware` przechwytuje nieobsłużone wyjątki i zwraca ustandaryzowaną odpowiedź błędu (500) bez ujawniania szczegółów wewnętrznych w produkcji.

### 4.8 Health Check

Endpoint `/health` (AllowAnonymous) sprawdza dostępność bazy danych SQLite i zwraca status w formacie JSON.

---

## 5. Frontend — szczegóły implementacji

### 5.1 Architektura

Single Page Application (SPA) zbudowana w React 18 z TypeScript. Bundler: Vite 5. Biblioteka UI: Ant Design 5 z dark theme.

#### Lazy Loading

Wszystkie strony ładowane leniwie (`React.lazy` + `Suspense`) dla optymalnego początkowego czasu ładowania.

#### Routing

React Router 6 z zagnieżdżonymi trasami. Trasy administracyjne chronione komponentem `RoleGuard` wymagającym roli Administrator.

#### Stan aplikacji

- **AuthContext** — kontekst React zarządzający stanem uwierzytelnienia (użytkownik, rola, tokeny).
- **Stan lokalny** — każda strona zarządza własnym stanem (formularze, dane z API) za pomocą hooków `useState`/`useEffect`.
- Brak globalnego store'u (Redux/Zustand) — stan przekazywany przez konteksty i propsy.

### 5.2 Komunikacja z API

Moduł `services/api.ts` eksportuje typowane funkcje dla każdego endpointu API. Klient Axios skonfigurowany z interceptorami:

**Request interceptor** — automatycznie dołącza header `Authorization: Bearer {token}`.

**Response interceptor** — przy błędzie 401 automatycznie próbuje odświeżyć token:

1. Kolejkuje równoległe żądania podczas refresha (wzorzec „failed queue").
2. Przy sukcesie — powtarza oryginalne żądanie z nowym tokenem.
3. Przy niepowodzeniu — dispatch eventu `auth:expired`, AuthContext wylogowuje użytkownika.

Tokeny przechowywane w `sessionStorage` (nie localStorage) — sesja kończy się po zamknięciu przeglądarki.

### 5.3 Komponent mapy

System zawiera własną implementację mapy kafelkowej (slippy map) bez zewnętrznych bibliotek mapowych (Leaflet/Mapbox):

- `useSlippyMap.ts` — hook zarządzający stanem mapy (centrum, zoom, drag).
- `MapTiles.tsx` — renderowanie kafelków OpenStreetMap.
- `MapOverlay.tsx` — rysowanie linii tras i markerów na canvasie SVG.
- `MapControls.tsx` — przyciski zoom in/out.
- `TrasaMapWidget.tsx` — widget integrujący wszystkie komponenty mapy.
- `mapUtils.ts` — przeliczenia współrzędnych geograficznych ↔ piksele.

### 5.4 Przejścia statusów w UI

Plik `constants/statusTransitions.ts` definiuje dostępne akcje (przyciski) dla każdej roli i statusu w czystej formie danych (bez JSX). Funkcja `getAvailableActions()` filtruje dostępne przejścia. Ikony mapowane oddzielnie w `utils/transitionIcons.tsx`.

### 5.5 Motyw i stylowanie

Dark theme zdefiniowany w `theme.ts` z paletą kolorów, gradientami i tokenami Ant Design. Sidebar z gradientowym tłem. Responsywny layout — na urządzeniach mobilnych menu chowa się w Drawer.

### 5.6 Obsługa błędów

- `ErrorBoundary` — łapie błędy renderowania React i wyświetla fallback UI.
- `extractApiError()` — parsuje różne formaty błędów API (tablica, obiekt, string) do czytelnego komunikatu.
- Formularze wyświetlają błędy walidacji zwrócone przez API.

---

## 6. Bezpieczeństwo

### 6.1 Uwierzytelnianie

- Hasła hashowane algorytmem **BCrypt** (biblioteka BCrypt.Net-Next).
- Tokeny JWT podpisywane kluczem symetrycznym **HS256** (min. 32 znaki).
- Refresh tokeny z rotacją — każde użycie generuje nowy token.
- Refresh tokeny przechowywane w bazie z datą wygaśnięcia, cyklicznie czyszczone.

### 6.2 Autoryzacja

- Globalny filtr `[AuthorizeFilter]` — każdy endpoint wymaga uwierzytelnienia.
- Autoryzacja oparta na rolach (`[Authorize(Roles = "...")]`).
- Frontend: komponent `RoleGuard` ukrywa trasy niedostępne dla danej roli.
- Backend: dodatkowa weryfikacja uprawnień w serwisach (edycja, zmiana statusu).

### 6.3 Ochrona transportu

- Security headers (CSP, X-Frame-Options, X-Content-Type-Options).
- HSTS w produkcji.
- CORS z białą listą originów.

### 6.4 Ochrona przed atakami

- **Rate limiting** — endpoint logowania: 5 prób / minutę.
- **Walidacja wejścia** — FluentValidation + constrainty bazodanowe.
- **Maksymalny rozmiar żądania** — 5 MB.
- **Brak ujawniania szczegółów** — middleware exception handler maskuje stack trace w produkcji.

---

## 7. Model danych — encje EF Core

### 7.1 Uzytkownik

| Pole | Typ | Ograniczenia |
|------|-----|-------------|
| Id | int | PK, auto |
| Imie | string | max 100, wymagane |
| Nazwisko | string | max 100, wymagane |
| Email | string | max 100, wymagane, unikalne, email |
| HasloHash | string | wymagane (BCrypt) |
| RolaId | int | FK → slownik_rol_uzytkownikow |
| Aktywny | bool | domyślnie true |

### 7.2 Helikopter

| Pole | Typ | Ograniczenia |
|------|-----|-------------|
| Id | int | PK, auto |
| NumerRejestracyjny | string | max 30, wymagane, unikalne |
| Typ | string | max 100, wymagane |
| Opis | string? | max 100 |
| MaksLiczbaCzlonkowZalogi | int | 1–10 |
| MaksUdzwigKg | int | 1–1000 |
| ZasiegKm | int | 1–1000 |
| Status | string | "aktywny" / "nieaktywny" |
| DataWaznosciPrzegladu | DateOnly? | wymagane gdy aktywny |

### 7.3 CzlonekZalogi

| Pole | Typ | Ograniczenia |
|------|-----|-------------|
| Id | int | PK, auto |
| Imie | string | max 100, wymagane |
| Nazwisko | string | max 100, wymagane |
| Email | string | max 100, wymagane, unikalne, email |
| WagaKg | int | 30–200 |
| RolaId | int | FK → slownik_rol_zalogi |
| NrLicencjiPilota | string? | max 30, wymagane dla Pilota |
| DataWaznosciLicencji | DateOnly? | wymagane dla Pilota |
| DataWaznosciSzkolenia | DateOnly | wymagane |

### 7.4 PlanowanaOperacja

| Pole | Typ | Opis |
|------|-----|------|
| Id | int | PK, auto |
| Numer | string | auto: OP-YYYY-NNN |
| NumerZleceniaProjektu | string | max 30, np. DE-25-12020 |
| OpisSkrocony | string | max 100 |
| KmlNazwaPliku | string? | nazwa wgranego pliku KML |
| KmlZawartosc | string? | surowy XML/KML |
| LiczbaKmTrasy | int | obliczana z punktów |
| ProponowanaDataOd/Do | DateOnly? | daty proponowane przez planującego |
| PlanowanaDataOd/Do | DateOnly? | daty ustalone przez nadzorującego |
| DodatkoweInfo | string? | max 500 |
| Komentarz | string? | max 500 |
| UwagiPoRealizacji | string? | max 500 |
| StatusId | int | FK → slownik_statusow_operacji |
| WprowadzajacyId | int | FK → uzytkownicy |

Relacje: PunktyTrasy (1:N), RodzajeCzynnosci (N:M), OsobyKontaktowe (N:M), Komentarze (1:N), HistoriaZmian (1:N).

### 7.5 ZlecenieNaLot

| Pole | Typ | Opis |
|------|-----|------|
| Id | int | PK, auto |
| Numer | string | auto: ZL-YYYY-NNN |
| PlanowanyStartDt | DateTime | data i godzina planowanego startu |
| PlanowaneLadowanieDt | DateTime | data i godzina planowanego lądowania |
| RzeczywistyStartDt | DateTime? | wymagane przed statusem 5/6 |
| RzeczywisteLadowanieDt | DateTime? | wymagane przed statusem 5/6 |
| PilotId | int | FK → czlonkowie_zalogi |
| HelikopterId | int | FK → helikoptery |
| LadowiskoStartoweId | int | FK → ladowiska |
| LadowiskoKoncoweId | int | FK → ladowiska |
| SzacowanaDlugoscTrasyKm | int | w km |
| WagaZalogiKg | int | obliczana automatycznie |
| StatusId | int | FK → slownik_statusow_zlecen |
| TworzacyId | int | FK → uzytkownicy |

Relacje: CzlonkowieZalogi (N:M), Operacje (N:M), HistoriaZmian (1:N).

---

## 8. Endpointy API — specyfikacja szczegółowa

### 8.1 Uwierzytelnianie

#### POST /api/auth/login

Logowanie użytkownika. Rate limited (5/min). AllowAnonymous.

**Request:**
```json
{
  "email": "admin@example.com",
  "haslo": "P@ssw0rd!"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbG...",
    "refreshToken": "abc123...",
    "uzytkownik": {
      "id": 1,
      "imie": "Jan",
      "nazwisko": "Kowalski",
      "email": "admin@example.com",
      "rolaId": 1,
      "rolaNazwa": "Administrator",
      "aktywny": true
    }
  }
}
```

**Response 401:** Nieprawidłowy email lub hasło.
**Response 429:** Zbyt wiele prób logowania.

#### POST /api/auth/refresh

Odświeżenie access tokenu z rotacją refresh tokenu.

**Request:**
```json
{ "refreshToken": "abc123..." }
```

**Response 200:** identyczny format jak login.
**Response 401:** Refresh token nieprawidłowy lub wygasł.

#### POST /api/auth/logout

Unieważnienie refresh tokenu. Wymaga autoryzacji.

**Request:**
```json
{ "refreshToken": "abc123..." }
```

**Response 204:** No Content.

### 8.2 Planowane operacje — filtrowanie

#### GET /api/operacje

**Query parameters:**

| Parametr | Typ | Domyślna | Opis |
|----------|-----|----------|------|
| statusId | int? | — | Filtr po statusie |
| numerZlecenia | string? | — | Filtr po numerze zlecenia/projektu |
| planowanaOd | date? | — | Planowana data od (min.) |
| planowanaDo | date? | — | Planowana data do (maks.) |
| strona | int | 1 | Numer strony |
| rozmiarStrony | int | 20 | Rozmiar strony |

Sortowanie domyślne: `planowana_data_od` rosnąco.

### 8.3 Zlecenia na lot — filtrowanie

#### GET /api/zlecenia

**Query parameters:**

| Parametr | Typ | Domyślna | Opis |
|----------|-----|----------|------|
| statusId | int? | — | Filtr po statusie |
| pilotId | int? | — | Filtr po pilocie |
| helikopterId | int? | — | Filtr po helikopterze |
| startOd | datetime? | — | Planowany start od |
| startDo | datetime? | — | Planowany start do |
| strona | int | 1 | Numer strony |
| rozmiarStrony | int | 20 | Rozmiar strony |

Sortowanie domyślne: `planowany_start_dt` rosnąco.

---

## 9. Procedury wdrożeniowe

### 9.1 Środowisko deweloperskie

1. Sklonuj repozytorium.
2. Backend: `cd aero-api && dotnet restore && dotnet run --environment Development`.
3. Frontend: `cd aero-front && npm install && npm run dev`.
4. Swagger UI: `https://localhost:64464/swagger`.
5. Aplikacja: `http://localhost:5173`.

### 9.2 Budowanie produkcyjne

#### Backend

```bash
cd aero-api/
dotnet publish -c Release -o ./publish
```

Wynikowy artefakt w katalogu `./publish`. Uruchomienie: `dotnet LotyApi.dll`.

Wymagane zmienne środowiskowe / konfiguracja:

- `JWT_SECRET_KEY` — klucz JWT (min. 32 losowe znaki).
- `ConnectionStrings:DefaultConnection` — connection string do bazy.
- `Cors:Origins` — lista dozwolonych originów.

#### Frontend

```bash
cd aero-front/
npm run build
```

Wynikowe pliki statyczne w katalogu `dist/`. Serwowane przez dowolny serwer HTTP (nginx, Apache, IIS) lub bezpośrednio przez ASP.NET Core `UseStaticFiles`.

Przed budowaniem ustaw `VITE_API_URL` w pliku `.env` na adres API produkcyjnego.

### 9.3 Migracje bazy danych

System korzysta z migracji EF Core. Przy pierwszym uruchomieniu na nowej bazie:

```bash
cd aero-api/
dotnet ef migrations add InitialCreate
dotnet ef database update
```

Przy kolejnych zmianach schematu:

```bash
dotnet ef migrations add NazwaZmiany
dotnet ef database update
```

Aplikacja automatycznie stosuje oczekujące migracje przy starcie (`db.Database.Migrate()`).

---

## 10. Testy

### 10.1 Testy backendu (xUnit)

Lokalizacja: `aero-api-tests/`

| Plik testowy | Zakres | Liczba linii |
|--------------|--------|:---:|
| `ValidatorsTests.cs` | Walidatory FluentValidation (helikoptery, załoga, operacje, zlecenia) | 669 |
| `ApiResultTests.cs` | Klasa ApiResult (Ok, Fail, kody odpowiedzi) | 231 |
| `AuthServiceTests.cs` | Serwis uwierzytelniania (login, refresh, revoke) | 102 |
| `NumeratorServiceTests.cs` | Generowanie numerów sekwencyjnych | — |

Uruchomienie:

```bash
cd aero-api-tests/
dotnet test
```

Z raportowaniem pokrycia kodu:

```bash
dotnet test --collect:"XPlat Code Coverage"
```

### 10.2 Testy frontendu (Vitest)

Lokalizacja: `aero-front/src/__tests__/`

| Plik testowy | Zakres |
|--------------|--------|
| `mapUtils.test.ts` | Przeliczenia współrzędnych geograficznych ↔ piksele |
| `statusTransitions.test.ts` | Reguły przejść statusów, filtrowanie akcji |
| `extractApiError.test.ts` | Parsowanie błędów API |
| `colors.test.ts` | Narzędzia kolorów UI |

Uruchomienie:

```bash
cd aero-front/
npm test            # jednorazowo
npm run test:watch  # tryb obserwowania zmian
```

---

## 11. Zależności zewnętrzne

### 11.1 Backend — pakiety NuGet

| Pakiet | Wersja | Przeznaczenie |
|--------|--------|---------------|
| Microsoft.EntityFrameworkCore | 8.0.11 | ORM |
| Microsoft.EntityFrameworkCore.Sqlite | 8.0.11 | Provider SQLite |
| Microsoft.EntityFrameworkCore.Design | 8.0.11 | Migracje (dev) |
| Microsoft.AspNetCore.Authentication.JwtBearer | 8.0.11 | Uwierzytelnianie JWT |
| Swashbuckle.AspNetCore | 6.9.0 | Swagger/OpenAPI |
| FluentValidation.AspNetCore | 11.3.0 | Walidacja wejścia |
| Serilog.AspNetCore | 8.0.3 | Logowanie strukturalne |
| Serilog.Sinks.Console | 6.0.0 | Logowanie do konsoli |
| Serilog.Sinks.File | 6.0.0 | Logowanie do plików |
| BCrypt.Net-Next | 4.0.3 | Hashowanie haseł |
| Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore | 8.0.11 | Health checks |

### 11.2 Frontend — pakiety npm

| Pakiet | Wersja | Przeznaczenie |
|--------|--------|---------------|
| react / react-dom | ^18.2.0 | Framework UI |
| react-router-dom | ^6.22.0 | Routing SPA |
| antd | ^5.14.0 | Biblioteka komponentów UI |
| @ant-design/icons | ^5.3.0 | Ikony Ant Design |
| axios | ^1.6.7 | Klient HTTP |
| dayjs | ^1.11.10 | Manipulacja datami |
| typescript | ^5.3.3 | Typowanie statyczne |
| vite | ^5.1.4 | Bundler / dev server |
| vitest | ^1.3.1 | Testy jednostkowe |

---

## 12. Znane ograniczenia i elementy poza zakresem

Zgodnie ze specyfikacją, poniższe funkcjonalności są poza zakresem obecnej wersji:

- Automatyczne wyliczanie szacowanej długości przelotu (uwzględniające odcinki między lądowiskami a trasą operacji).
- Automatyczne pokazywanie optymalnej trasy przelotu.
- Dodatkowe walidacje wykraczające poza zdefiniowane w specyfikacji.
- Obsługa wielu języków (i18n) — interfejs wyłącznie w języku polskim.
- Generowanie raportów i eksport danych.
- Powiadomienia email/push.
- Logowanie operacji audytowych poza zmianami statusów i dat.
