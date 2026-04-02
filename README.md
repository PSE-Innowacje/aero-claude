# LotyAdmin — Ewidencja Planowanych Operacji Lotniczych

## Opis projektu

LotyAdmin to aplikacja webowa do ewidencji planowanych operacji lotniczych oraz przygotowania zleceń na lot helikopterem. System wspiera cały cykl życia operacji lotniczej — od zgłoszenia zapotrzebowania, przez planowanie i akceptację, aż po realizację i raportowanie.

Aplikacja umożliwia wizualizację tras lotów na mapie na podstawie plików KML, automatyczne walidacje proceduralne (ważność przeglądów, licencji, udźwig helikoptera) oraz kaskadowe zarządzanie statusami operacji i zleceń.

---

## Spis treści

1. [Architektura systemu](#architektura-systemu)
2. [Stos technologiczny](#stos-technologiczny)
3. [Wymagania systemowe](#wymagania-systemowe)
4. [Instalacja i uruchomienie](#instalacja-i-uruchomienie)
5. [Konfiguracja](#konfiguracja)
6. [Role i uprawnienia](#role-i-uprawnienia)
7. [Moduły funkcjonalne](#moduły-funkcjonalne)
8. [Struktura projektu](#struktura-projektu)
9. [API — przegląd endpointów](#api--przegląd-endpointów)
10. [Testy](#testy)
11. [Licencja](#licencja)

---

## Architektura systemu

Projekt składa się z trzech niezależnych komponentów:

| Komponent | Katalog | Opis |
|-----------|---------|------|
| **Backend API** | `aero-api/` | REST API w .NET 8 (C#) z Entity Framework Core i SQLite |
| **Frontend SPA** | `aero-front/` | Aplikacja React 18 + TypeScript + Ant Design, budowana przez Vite |
| **Baza danych** | `aero-db/` | Schemat SQLite z danymi inicjalnymi (słowniki) |

Komunikacja między frontendem a backendem odbywa się przez REST API z uwierzytelnieniem JWT (access token + refresh token). Frontend przechowuje tokeny w `sessionStorage`.

---

## Stos technologiczny

### Backend

- **.NET 8** (ASP.NET Core Web API)
- **Entity Framework Core 8** z providerem SQLite
- **SQLite** — lekka baza danych plikowa
- **JWT Bearer Authentication** — access token (30 min) + refresh token (7 dni) z rotacją
- **FluentValidation** — walidacja danych wejściowych
- **Serilog** — strukturalne logowanie do konsoli i plików
- **Swashbuckle (Swagger)** — dokumentacja API
- **BCrypt.Net** — hashowanie haseł
- **Rate Limiting** — ochrona endpointu logowania

### Frontend

- **React 18** z lazy loading stron
- **TypeScript 5.3**
- **Ant Design 5** — biblioteka komponentów UI (dark theme)
- **React Router 6** — routing SPA
- **Axios** — klient HTTP z interceptorami (automatyczny refresh tokenów)
- **Day.js** — operacje na datach
- **Vite 5** — bundler i dev server
- **Vitest** — testy jednostkowe frontendu

### Narzędzia deweloperskie

- **ESLint** + **Prettier** — linting i formatowanie kodu
- **xUnit** + **Coverlet** — testy jednostkowe backendu

---

## Wymagania systemowe

- **.NET 8 SDK** (>= 8.0)
- **Node.js** (>= 18) z **npm**
- Przeglądarka wspierająca ES2020+ (Chrome, Firefox, Edge, Safari)

---

## Instalacja i uruchomienie

### 1. Backend API

```bash
cd aero-api/

# Przywrócenie pakietów
dotnet restore

# Uruchomienie w trybie deweloperskim
dotnet run --environment Development
```

API uruchomi się domyślnie pod adresem `https://localhost:64464`. Swagger UI będzie dostępny pod `/swagger`.

Przy pierwszym uruchomieniu baza danych (`loty.db`) zostanie automatycznie utworzona i zainicjalizowana migracjami EF Core oraz danymi słownikowymi.

### 2. Frontend

```bash
cd aero-front/

# Instalacja zależności
npm install

# Uruchomienie dev servera
npm run dev
```

Aplikacja frontendowa uruchomi się pod adresem `http://localhost:5173`.

### 3. Inicjalizacja bazy danych (opcjonalnie)

Jeśli chcesz stworzyć bazę od zera z samego schematu SQL:

```bash
cd aero-db/
sqlite3 loty.db < schema.sql
```

---

## Konfiguracja

### Backend (`appsettings.json` / `appsettings.Development.json`)

| Klucz | Opis | Wartość domyślna |
|-------|------|------------------|
| `ConnectionStrings:DefaultConnection` | Connection string do SQLite | `Data Source=loty.db` |
| `Jwt:SecretKey` | Klucz symetryczny JWT (min. 32 znaki) | Wymagany (dev: w appsettings.Development.json) |
| `Jwt:Issuer` | Issuer tokenu JWT | `LotyApi` |
| `Jwt:Audience` | Audience tokenu JWT | `LotyApiClients` |
| `Jwt:AccessTokenMinutes` | Czas życia access tokenu (minuty) | `30` |
| `Jwt:RefreshTokenDays` | Czas życia refresh tokenu (dni) | `7` |
| `Cors:Origins` | Dozwolone originy CORS | `["http://localhost:5173"]` (dev) |
| `RateLimiting:LoginPermitLimit` | Maks. prób logowania w oknie | `5` |
| `RateLimiting:LoginWindowMinutes` | Okno rate limitingu (minuty) | `1` |

**Klucz JWT w produkcji** — ustaw zmienną środowiskową `JWT_SECRET_KEY` (min. 32 losowe znaki). Nigdy nie commituj klucza produkcyjnego do repozytorium.

### Frontend (`.env`)

| Zmienna | Opis | Wartość domyślna |
|---------|------|------------------|
| `VITE_API_URL` | Bazowy URL API backendu | `https://localhost:64464` |

---

## Role i uprawnienia

System definiuje cztery role użytkowników z odmiennym dostępem do modułów:

| Rola | Administracja | Planowanie operacji | Zlecenia na lot |
|------|:---:|:---:|:---:|
| **Administrator** | Tworzenie / Edycja / Podgląd | Podgląd | Podgląd |
| **Osoba planująca** | Brak | Tworzenie / Edycja / Podgląd | Brak |
| **Osoba nadzorująca** | Podgląd | Tworzenie / Edycja / Podgląd | Edycja / Podgląd |
| **Pilot** | Podgląd | Podgląd | Tworzenie / Edycja / Podgląd |

---

## Moduły funkcjonalne

### Administracja

Moduł dostępny dla Administratora. Obejmuje zarządzanie:

- **Helikoptery** — rejestr floty z danymi technicznymi (numer rejestracyjny, typ, udźwig, zasięg, data przeglądu, status aktywny/nieaktywny).
- **Członkowie załogi** — dane personelu lotniczego z podziałem na role (Pilot, Obserwator), wagą, licencjami i szkoleniami.
- **Lądowiska planowe** — punkty ze współrzędnymi geograficznymi (szerokość/długość).
- **Użytkownicy** — konta systemowe z przypisanymi rolami.

### Planowanie operacji lotniczych

Pełny cykl życia planowanej operacji lotniczej:

1. **Wprowadzenie** (Osoba planująca) — zgłoszenie zapotrzebowania na lot z opisem trasy (KML), proponowanymi datami, rodzajami czynności.
2. **Potwierdzenie/Odrzucenie** (Osoba nadzorująca) — weryfikacja i ustalenie planowanych dat.
3. **Przypisanie do zlecenia** (automatycznie) — po wybraniu operacji do zlecenia na lot.
4. **Realizacja/Raportowanie** (Pilot) — oznaczenie stopnia realizacji.
5. **Rezygnacja** (Osoba planująca) — wycofanie operacji.

Statusy operacji: Wprowadzone → Potwierdzone do planu → Zaplanowane do zlecenia → Zrealizowane / Częściowo zrealizowane / Rezygnacja.

### Zlecenia na lot

Kompletny dokument zlecenia obejmujący:

- Wybór helikoptera, pilota i członków załogi z walidacjami proceduralnymi.
- Wybór lądowisk (startowe i końcowe).
- Przypisanie planowanych operacji lotniczych.
- Wizualizację trasy na mapie (lądowiska + punkty z KML).
- Walidacje bezpieczeństwa: ważność przeglądu helikoptera, licencji pilota, szkolenia załogi, udźwig, zasięg.
- Rozliczanie po realizacji (czasy rzeczywiste).

Statusy zleceń: Wprowadzone → Przekazane do akceptacji → Zaakceptowane → Zrealizowane / Nie zrealizowane.

### Mapa i trasy lotów

- Wizualizacja punktów trasy z plików KML na interaktywnej mapie (tile-based slippy map z OpenStreetMap).
- Podgląd tras dla pojedynczych operacji i kompletnych zleceń.
- Widok zbiorczy tras lotów.

---

## Struktura projektu

```
aero-api/                          # Backend .NET 8
├── Common/                        # Klasy pomocnicze
│   ├── ApiResult.cs               # Ustandaryzowana odpowiedź API
│   ├── CurrentUser.cs             # DTO zalogowanego użytkownika z JWT
│   ├── Roles.cs                   # Stałe ról, statusów operacji i zleceń
│   ├── ServiceResult.cs           # Wynik operacji serwisowej
│   └── StatusMachine.cs           # Maszyna stanów (dozwolone przejścia)
├── Controllers/                   # Kontrolery REST
│   ├── AuthController.cs          # Logowanie, refresh, logout
│   ├── AdministracjaControllers.cs # Użytkownicy, helikoptery, załoga, lądowiska, słowniki
│   ├── OperacjeController.cs      # CRUD operacji + komentarze + historia
│   └── ZleceniaController.cs      # CRUD zleceń + historia
├── Data/
│   └── LotyDbContext.cs           # EF Core DbContext
├── DTOs/
│   └── Dtos.cs                    # Data Transfer Objects (request/response)
├── Middleware/
│   └── ExceptionHandlingMiddleware.cs
├── Models/                        # Encje bazodanowe
│   ├── Administracja.cs           # Uzytkownik, Helikopter, CzlonekZalogi, Ladowisko
│   ├── PlanowaneOperacje.cs       # PlanowanaOperacja + relacje
│   ├── ZleceniaNaLot.cs           # ZlecenieNaLot + relacje
│   ├── Slowniki.cs                # Encje słownikowe
│   ├── Numerator.cs               # Autonumeracja (OP-YYYY-NNN, ZL-YYYY-NNN)
│   └── RefreshToken.cs            # Token odświeżający
├── Services/                      # Logika biznesowa
│   ├── AuthService.cs             # Uwierzytelnianie JWT + refresh
│   ├── OperacjaService.cs         # Operacje lotnicze (CRUD, statusy, historia)
│   ├── ZlecenieService.cs         # Zlecenia na lot (CRUD, statusy, walidacje)
│   ├── NumeratorService.cs        # Generowanie numerów sekwencyjnych
│   └── ...                        # Serwisy CRUD dla encji administracyjnych
├── Validators/
│   └── Validators.cs              # FluentValidation — reguły walidacji
├── Program.cs                     # Konfiguracja i uruchomienie aplikacji
├── appsettings.json               # Konfiguracja produkcyjna
└── appsettings.Development.json   # Konfiguracja deweloperska

aero-front/                        # Frontend React + TypeScript
├── src/
│   ├── components/                # Komponenty współdzielone
│   │   ├── ErrorBoundary.tsx      # Obsługa błędów React
│   │   ├── GradientMenu.tsx       # Menu boczne z gradientem
│   │   ├── MapControls.tsx        # Kontrolki mapy (zoom)
│   │   ├── MapOverlay.tsx         # Nakładka na mapę (markery, linie)
│   │   ├── MapTiles.tsx           # Kafelki mapy (OSM)
│   │   ├── PageHeader.tsx         # Nagłówek strony
│   │   ├── RoleGuard.tsx          # Ochrona tras wg roli
│   │   ├── StatusTag.tsx          # Kolorowy znacznik statusu
│   │   └── TrasaMapWidget.tsx     # Widget mapy trasy
│   ├── constants/
│   │   ├── statusy.ts             # Stałe statusów
│   │   └── statusTransitions.ts   # Reguły przejść statusów per rola
│   ├── context/
│   │   └── AuthContext.tsx         # Kontekst uwierzytelniania
│   ├── hooks/
│   │   ├── useDebounce.ts         # Hook debounce
│   │   └── useSlippyMap.ts        # Hook mapy kafelkowej
│   ├── pages/                     # Strony aplikacji
│   │   ├── LoginPage.tsx          # Logowanie
│   │   ├── DashboardPage.tsx      # Dashboard
│   │   ├── OperacjePage.tsx       # Lista operacji
│   │   ├── OperacjaFormPage.tsx   # Formularz operacji
│   │   ├── OperacjaDetailPage.tsx # Szczegóły operacji
│   │   ├── ZleceniaPage.tsx       # Lista zleceń
│   │   ├── ZlecenieFormPage.tsx   # Formularz zlecenia
│   │   ├── ZlecenieDetailPage.tsx # Szczegóły zlecenia
│   │   ├── TrasyLotowPage.tsx     # Mapa tras lotów
│   │   ├── HelikopteryPage.tsx    # Lista helikopterów
│   │   ├── HelikopterFormPage.tsx # Formularz helikoptera
│   │   └── ...                    # Pozostałe strony administracyjne
│   ├── services/
│   │   └── api.ts                 # Klient HTTP (Axios) z interceptorami
│   ├── types/
│   │   └── api.ts                 # Definicje typów TypeScript
│   ├── utils/                     # Narzędzia pomocnicze
│   ├── App.tsx                    # Główny komponent z routingiem
│   ├── main.tsx                   # Punkt wejścia
│   └── theme.ts                   # Motyw Ant Design (dark)
├── package.json
├── tsconfig.json
└── vite.config.js

aero-db/                           # Baza danych
├── schema.sql                     # Pełny schemat DDL + dane inicjalne
└── loty.db                        # Plik bazy SQLite

aero-api-tests/                    # Testy jednostkowe backendu
├── Common/
│   └── ApiResultTests.cs
├── Services/
│   ├── AuthServiceTests.cs
│   └── NumeratorServiceTests.cs
└── Validators/
    └── ValidatorsTests.cs
```

---

## API — przegląd endpointów

Pełna dokumentacja API jest dostępna przez Swagger UI pod `/swagger` po uruchomieniu backendu w trybie Development.

### Uwierzytelnianie

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/auth/login` | Logowanie (zwraca JWT + refresh token) |
| POST | `/api/auth/refresh` | Odświeżenie access tokenu |
| POST | `/api/auth/logout` | Wylogowanie (unieważnienie refresh tokenu) |

### Słowniki

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/slowniki/role-uzytkownikow` | Role użytkowników systemu |
| GET | `/api/slowniki/role-zalogi` | Role członków załogi |
| GET | `/api/slowniki/rodzaje-czynnosci` | Rodzaje czynności lotniczych |
| GET | `/api/slowniki/statusy-operacji` | Statusy planowanych operacji |
| GET | `/api/slowniki/statusy-zlecen` | Statusy zleceń na lot |

### Administracja

| Metoda | Endpoint | Opis | Rola |
|--------|----------|------|------|
| GET | `/api/uzytkownicy` | Lista użytkowników | Administrator |
| GET/POST/PUT | `/api/uzytkownicy/{id}` | CRUD użytkownika | Administrator |
| GET | `/api/helikoptery` | Lista helikopterów | Wszyscy zalogowani |
| POST/PUT | `/api/helikoptery/{id}` | Tworzenie/edycja | Administrator |
| GET | `/api/czlonkowie-zalogi` | Lista członków załogi | Wszyscy zalogowani |
| POST/PUT | `/api/czlonkowie-zalogi/{id}` | Tworzenie/edycja | Administrator |
| GET | `/api/ladowiska` | Lista lądowisk | Wszyscy zalogowani |
| POST/PUT | `/api/ladowiska/{id}` | Tworzenie/edycja | Administrator |

### Planowane operacje lotnicze

| Metoda | Endpoint | Opis | Rola |
|--------|----------|------|------|
| GET | `/api/operacje` | Lista operacji (stronicowana, filtry) | Wszyscy zalogowani |
| GET | `/api/operacje/{id}` | Szczegóły operacji | Wszyscy zalogowani |
| POST | `/api/operacje` | Nowa operacja | Osoba planująca, nadzorująca |
| PUT | `/api/operacje/{id}` | Edycja operacji | Osoba planująca, nadzorująca |
| POST | `/api/operacje/{id}/status` | Zmiana statusu | Osoba planująca, nadzorująca |
| GET | `/api/operacje/{id}/komentarze` | Komentarze | Wszyscy zalogowani |
| POST | `/api/operacje/{id}/komentarze` | Dodaj komentarz | Wszyscy zalogowani |
| GET | `/api/operacje/{id}/historia` | Historia zmian | Wszyscy zalogowani |

### Zlecenia na lot

| Metoda | Endpoint | Opis | Rola |
|--------|----------|------|------|
| GET | `/api/zlecenia` | Lista zleceń (stronicowana, filtry) | Wszyscy zalogowani |
| GET | `/api/zlecenia/{id}` | Szczegóły zlecenia | Wszyscy zalogowani |
| POST | `/api/zlecenia` | Nowe zlecenie | Pilot |
| PUT | `/api/zlecenia/{id}` | Edycja zlecenia | Pilot, Osoba nadzorująca |
| POST | `/api/zlecenia/{id}/status` | Zmiana statusu | Pilot, Osoba nadzorująca |
| GET | `/api/zlecenia/{id}/historia` | Historia zmian | Wszyscy zalogowani |

---

## Testy

### Backend (xUnit)

```bash
cd aero-api-tests/
dotnet test
```

Pokrycie obejmuje: walidatory (FluentValidation), serwis uwierzytelniania, serwis numeratorów, klasy pomocnicze (ApiResult).

### Frontend (Vitest)

```bash
cd aero-front/
npm test
```

Testy jednostkowe obejmują: funkcje mapowe, statusy i przejścia, ekstrakcję błędów API, narzędzia kolorów.

---

## Licencja

Projekt wewnętrzny. Wszelkie prawa zastrzeżone.
