# LotyApi — REST API (.NET 8.0 + EF Core + SQLite)

Aplikacja backendowa do ewidencji planowanych operacji lotniczych i zleceń na lot.

---

## Wymagania

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- SQLite (plik `loty.db` — istniejący lub tworzony automatycznie)

---

## Uruchomienie

```bash
cd LotyApi

# Przywróć pakiety
dotnet restore

# Uruchom (tryb deweloperski)
dotnet run
```

Swagger UI dostępny pod: `http://localhost:5000/swagger`

---

## Konfiguracja

Plik `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=loty.db"
  },
  "Jwt": {
    "SecretKey": "ZMIEN-NA-SILNY-KLUCZ-MIN-32-ZNAKI-!!",
    "Issuer":    "LotyApi",
    "Audience":  "LotyApiClients"
  }
}
```

> **Ważne:** Zmień `SecretKey` przed wdrożeniem na produkcję (min. 32 znaki).  
> Użyj zmiennej środowiskowej: `Jwt__SecretKey=...`

### Wskazanie istniejącej bazy

Skopiuj `loty.db` do katalogu projektu i ustaw ścieżkę:

```json
"DefaultConnection": "Data Source=/ścieżka/do/loty.db"
```

---

## Struktura projektu

```
LotyApi/
├── Controllers/
│   ├── AuthController.cs          # POST /api/auth/login + słowniki
│   ├── AdministracjaControllers.cs # Użytkownicy, Helikoptery, Załoga, Lądowiska
│   ├── OperacjeController.cs      # Planowane operacje lotnicze
│   └── ZleceniaController.cs      # Zlecenia na lot
├── Data/
│   └── LotyDbContext.cs           # EF Core DbContext + pełna konfiguracja
├── DTOs/
│   └── Dtos.cs                    # Rekordy request/response
├── Models/
│   ├── Slowniki.cs                # Encje słownikowe
│   ├── Administracja.cs           # Uzytkownik, Helikopter, CzlonekZalogi, Ladowisko
│   ├── PlanowaneOperacje.cs       # PlanowanaOperacja + tabele powiązane
│   └── ZleceniaNaLot.cs           # ZlecenieNaLot + tabele powiązane
├── Services/
│   ├── AuthService.cs             # JWT login
│   └── NumeratorService.cs        # Generowanie numerów OP-RRRR-NNNN / ZL-RRRR-NNNN
├── appsettings.json
├── appsettings.Development.json
└── LotyApi.csproj
```

---

## Uwierzytelnianie

Wszystkie endpointy (poza `/api/auth/login`) wymagają tokena JWT.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "pilot@example.com",
  "haslo": "tajnehaslo"
}
```

**Odpowiedź:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "uzytkownik": {
    "id": 1,
    "imie": "Jan",
    "nazwisko": "Kowalski",
    "email": "pilot@example.com",
    "rolaId": 4,
    "rolaNazwa": "Pilot",
    "aktywny": true
  }
}
```

Użyj tokena w nagłówku każdego kolejnego żądania:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Endpointy API

### Słowniki

| Metoda | URL | Opis |
|--------|-----|------|
| GET | `/api/slowniki/role-uzytkownikow` | Role użytkowników systemu |
| GET | `/api/slowniki/role-zalogi` | Role członków załogi |
| GET | `/api/slowniki/rodzaje-czynnosci` | Rodzaje czynności lotniczych |
| GET | `/api/slowniki/statusy-operacji` | Statusy planowanych operacji |
| GET | `/api/slowniki/statusy-zlecen` | Statusy zleceń na lot |

---

### Administracja

#### Użytkownicy (tylko `Administrator`)

| Metoda | URL | Opis |
|--------|-----|------|
| GET | `/api/uzytkownicy` | Lista użytkowników |
| GET | `/api/uzytkownicy/{id}` | Szczegóły użytkownika |
| POST | `/api/uzytkownicy` | Utwórz użytkownika |
| PUT | `/api/uzytkownicy/{id}` | Aktualizuj użytkownika |

**Utwórz użytkownika (POST):**
```json
{
  "imie": "Anna",
  "nazwisko": "Nowak",
  "email": "anna@example.com",
  "haslo": "bezpieczneHaslo123",
  "rolaId": 2
}
```

#### Helikoptery

| Metoda | URL | Opis | Rola |
|--------|-----|------|------|
| GET | `/api/helikoptery` | Lista (sortowana: status, nr rej.) | wszyscy |
| GET | `/api/helikoptery/{id}` | Szczegóły | wszyscy |
| POST | `/api/helikoptery` | Utwórz | Administrator |
| PUT | `/api/helikoptery/{id}` | Aktualizuj | Administrator |

**Utwórz helikopter (POST):**
```json
{
  "numerRejestracyjny": "SP-HXY",
  "typ": "Airbus H125",
  "opis": "Helikopter patrolowy",
  "maksLiczbaCzlonkowZalogi": 4,
  "maksUdzwigKg": 600,
  "zasiegKm": 650,
  "status": "aktywny",
  "dataWaznosciPrzegladu": "2026-12-31"
}
```

#### Członkowie załogi

| Metoda | URL | Opis | Rola |
|--------|-----|------|------|
| GET | `/api/czlonkowie-zalogi` | Lista (sortowana: email) | wszyscy |
| GET | `/api/czlonkowie-zalogi/{id}` | Szczegóły | wszyscy |
| POST | `/api/czlonkowie-zalogi` | Utwórz | Administrator |
| PUT | `/api/czlonkowie-zalogi/{id}` | Aktualizuj | Administrator |

**Utwórz członka załogi (POST):**
```json
{
  "imie": "Marek",
  "nazwisko": "Pilotowski",
  "email": "marek@example.com",
  "wagaKg": 85,
  "rolaId": 1,
  "nrLicencjiPilota": "PL-PIL-2024-001",
  "dataWaznosciLicencji": "2027-06-30",
  "dataWaznosciSzkolenia": "2026-09-15"
}
```

#### Lądowiska

| Metoda | URL | Opis | Rola |
|--------|-----|------|------|
| GET | `/api/ladowiska` | Lista (sortowana: nazwa) | wszyscy |
| GET | `/api/ladowiska/{id}` | Szczegóły | wszyscy |
| POST | `/api/ladowiska` | Utwórz | Administrator |
| PUT | `/api/ladowiska/{id}` | Aktualizuj | Administrator |

**Utwórz lądowisko (POST):**
```json
{
  "nazwa": "Krajnik",
  "szerokosc": 53.0312,
  "dlugosc": 14.3156,
  "opis": "Lądowisko leśne Krajnik"
}
```

---

### Planowane operacje lotnicze

| Metoda | URL | Opis | Rola |
|--------|-----|------|------|
| GET | `/api/operacje?statusId=3` | Lista (domyślnie status 3) | wszyscy |
| GET | `/api/operacje/{id}` | Szczegóły z punktami trasy | wszyscy |
| POST | `/api/operacje` | Utwórz | Osoba planująca, Nadzorująca |
| PUT | `/api/operacje/{id}` | Aktualizuj | Osoba planująca, Nadzorująca |
| POST | `/api/operacje/{id}/status` | Zmień status | Osoba planująca, Nadzorująca |
| GET | `/api/operacje/{id}/komentarze` | Lista komentarzy | wszyscy |
| POST | `/api/operacje/{id}/komentarze` | Dodaj komentarz | wszyscy zalogowani |
| GET | `/api/operacje/{id}/historia` | Historia zmian | wszyscy |

**Utwórz operację (POST):**
```json
{
  "numerZleceniaProjektu": "DE-25-12020",
  "opisSkrocony": "Lot odcinka leśnego Krajnik - Plewiska",
  "kmlNazwaPliku": "krajnik_plewiska.kml",
  "kmlZawartosc": "<kml>...</kml>",
  "liczbaKmTrasy": 145,
  "proponowanaDataOd": "2026-05-01",
  "proponowanaDataDo": "2026-09-30",
  "dodatkoweInfo": "Pilne oględziny przed sezonem wegetatywnym",
  "rodzajeCzynnosciIds": [1, 2],
  "punktyTrasy": [
    { "kolejnosc": 1, "szerokosc": 53.0312, "dlugosc": 14.3156 },
    { "kolejnosc": 2, "szerokosc": 52.4068, "dlugosc": 16.9300 }
  ],
  "osobyKontaktoweIds": [2, 3]
}
```

**Zmień status operacji (POST `/api/operacje/{id}/status`):**

| Rola | Z | Na | Przycisk |
|------|---|----|---------|
| Osoba nadzorująca | 1 | 2 | Odrzuć |
| Osoba nadzorująca | 1 | 3 | Potwierdź do planu |
| Osoba planująca | 1/3/4 | 7 | Rezygnuj |

```json
{
  "statusId": 3,
  "komentarz": "Zaplanowano na maj 2026"
}
```

---

### Zlecenia na lot

| Metoda | URL | Opis | Rola |
|--------|-----|------|------|
| GET | `/api/zlecenia?statusId=2` | Lista (domyślnie status 2) | wszyscy |
| GET | `/api/zlecenia/{id}` | Szczegóły | wszyscy |
| POST | `/api/zlecenia` | Utwórz | Pilot |
| PUT | `/api/zlecenia/{id}` | Aktualizuj | Pilot, Osoba nadzorująca |
| POST | `/api/zlecenia/{id}/status` | Zmień status | Pilot, Osoba nadzorująca |
| GET | `/api/zlecenia/{id}/historia` | Historia zmian | wszyscy |

**Utwórz zlecenie (POST):**
```json
{
  "planowanyStartDt": "2026-05-15T08:00:00",
  "planowaneLadowanieDt": "2026-05-15T16:00:00",
  "helikopterId": 1,
  "ladowiskoStartoweId": 1,
  "ladowiskoKoncoweId": 2,
  "szacowanaDlugoscTrasy": 145,
  "czlonkowieZalogiIds": [2],
  "operacjeIds": [1, 3]
}
```

> Pilot jest uzupełniany automatycznie z zalogowanego użytkownika.  
> Waga załogi jest wyliczana automatycznie.

**Zmień status zlecenia (POST `/api/zlecenia/{id}/status`):**

| Rola | Z | Na | Akcja |
|------|---|----|-------|
| Pilot | 1 | 2 | Przekaż do akceptacji |
| Osoba nadzorująca | 2 | 3 | Odrzuć |
| Osoba nadzorująca | 2 | 4 | Zaakceptuj |
| Pilot | 4 | 5 | Zrealizowane w części |
| Pilot | 4 | 6 | Zrealizowane w całości |
| Pilot | 4 | 7 | Nie zrealizowane |

```json
{ "statusId": 4 }
```

**Automatyczne kaskadowe zmiany statusów operacji:**

| Status zlecenia | Zmiana statusu operacji |
|-----------------|------------------------|
| Zlecenie utworzone (1) | Operacje: 3 → 4 |
| Pilot: Zrealizowane w części (5) | Operacje: 4 → 5 |
| Pilot: Zrealizowane w całości (6) | Operacje: 4 → 6 |
| Pilot: Nie zrealizowane (7) | Operacje: 4 → 3 |

---

## Uprawnienia do endpointów

| Zasób | Administrator | Osoba planująca | Osoba nadzorująca | Pilot |
|-------|:---:|:---:|:---:|:---:|
| Słowniki | ✅ | ✅ | ✅ | ✅ |
| Użytkownicy CRUD | ✅ | ❌ | ❌ | ❌ |
| Helikoptery (odczyt) | ✅ | ✅ | ✅ | ✅ |
| Helikoptery (zapis) | ✅ | ❌ | ❌ | ❌ |
| Załoga (odczyt) | ✅ | ✅ | ✅ | ✅ |
| Załoga (zapis) | ✅ | ❌ | ❌ | ❌ |
| Lądowiska (odczyt) | ✅ | ✅ | ✅ | ✅ |
| Lądowiska (zapis) | ✅ | ❌ | ❌ | ❌ |
| Operacje (odczyt) | ✅ | ✅ | ✅ | ✅ |
| Operacje (zapis) | ❌ | ✅ | ✅ | ❌ |
| Zlecenia (odczyt) | ✅ | ❌ | ✅ | ✅ |
| Zlecenia (zapis/tworzenie) | ❌ | ❌ | ✅ | ✅ |

---

## Walidacje biznesowe (przy tworzeniu zlecenia)

System automatycznie blokuje zapis zlecenia gdy:

- Helikopter ma **nieważny przegląd** na dzień planowanego lotu
- Pilot ma **nieważną licencję** na dzień planowanego lotu
- Pilot lub członek załogi ma **nieważne szkolenie** na dzień planowanego lotu
- **Waga załogi** przekracza maksymalny udźwig wybranego helikoptera
- **Szacowana długość trasy** przekracza zasięg helikoptera

---

## Numeracja automatyczna

| Typ | Format | Przykład |
|-----|--------|---------|
| Planowana operacja | `OP-RRRR-NNNN` | `OP-2026-0001` |
| Zlecenie na lot | `ZL-RRRR-NNNN` | `ZL-2026-0001` |

---

## Pakiety NuGet

| Pakiet | Wersja | Cel |
|--------|--------|-----|
| Microsoft.EntityFrameworkCore | 8.0.11 | ORM |
| Microsoft.EntityFrameworkCore.Sqlite | 8.0.11 | Provider SQLite |
| Microsoft.EntityFrameworkCore.Design | 8.0.11 | Migracje CLI |
| Microsoft.AspNetCore.Authentication.JwtBearer | 8.0.11 | Uwierzytelnianie JWT |
| Swashbuckle.AspNetCore | 6.9.0 | Swagger UI |
| BCrypt.Net-Next | 4.0.3 | Hashowanie haseł |

---

## Migracje EF Core (opcjonalnie)

Jeśli chcesz zarządzać schematem przez migracje zamiast `EnsureCreated`:

```bash
# Zainstaluj narzędzie CLI
dotnet tool install --global dotnet-ef

# Utwórz pierwszą migrację
dotnet ef migrations add InitialCreate

# Zastosuj migrację
dotnet ef database update
```

---

## Przykładowe kody odpowiedzi

| Kod | Znaczenie |
|-----|-----------|
| 200 OK | Sukces |
| 201 Created | Zasób utworzony (z nagłówkiem `Location`) |
| 204 No Content | Aktualizacja udana |
| 400 Bad Request | Błąd walidacji lub niedozwolona zmiana statusu |
| 401 Unauthorized | Brak lub nieprawidłowy token JWT |
| 403 Forbidden | Brak uprawnień do operacji |
| 404 Not Found | Zasób nie istnieje |
| 409 Conflict | Duplikat (np. email już zajęty) |
