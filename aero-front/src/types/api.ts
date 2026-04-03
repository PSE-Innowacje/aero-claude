// ── API wrapper ──────────────────────────────────────────────

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export interface PagedResult<T> {
  items: T[];
  strona: number;
  rozmiarStrony: number;
  lacznaLiczba: number;
  lacznaLiczbaStron: number;
  maPoprzednia: boolean;
  maNastepna: boolean;
}

// ── Auth ─────────────────────────────────────────────────────

export interface LoginResponseDto {
  token: string;
  refreshToken: string;
  uzytkownik: UzytkownikDto;
}

// ── Użytkownicy ──────────────────────────────────────────────

export interface UzytkownikDto {
  id: number;
  imie: string;
  nazwisko: string;
  email: string;
  rolaId: number;
  rolaNazwa: string;
  aktywny: boolean;
}

export interface UzytkownikPayload {
  imie: string;
  nazwisko: string;
  email: string;
  rolaId: number;
  haslo?: string;
  aktywny?: boolean;
}

// ── Słowniki ─────────────────────────────────────────────────

export interface SlownikDto {
  id: number;
  nazwa: string;
}

// ── Helikoptery ──────────────────────────────────────────────

export interface HelikopterDto {
  id: number;
  numerRejestracyjny: string;
  typ: string;
  opis?: string;
  maksLiczbaCzlonkowZalogi: number;
  maksUdzwigKg: number;
  zasiegKm: number;
  status: string;
  dataWaznosciPrzegladu?: string;
}

export interface HelikopterPayload {
  numerRejestracyjny: string;
  typ: string;
  opis?: string;
  maksLiczbaCzlonkowZalogi: number;
  maksUdzwigKg: number;
  zasiegKm: number;
  status: string;
  dataWaznosciPrzegladu?: string | null;
}

// ── Członkowie załogi ────────────────────────────────────────

export interface CzlonekZalogiDto {
  id: number;
  imie: string;
  nazwisko: string;
  email: string;
  wagaKg: number;
  rolaId: number;
  rolaNazwa: string;
  nrLicencjiPilota?: string;
  dataWaznosciLicencji?: string;
  dataWaznosciSzkolenia: string;
  aktywny: boolean;
}

export interface CzlonekZalogiPayload {
  imie: string;
  nazwisko: string;
  email: string;
  wagaKg: number;
  rolaId: number;
  nrLicencjiPilota?: string;
  dataWaznosciLicencji?: string | null;
  dataWaznosciSzkolenia: string;
  aktywny?: boolean;
}

// ── Lądowiska ────────────────────────────────────────────────

export interface LadowiskoDto {
  id: number;
  nazwa: string;
  szerokosc: number;
  dlugosc: number;
  opis?: string;
}

export interface LadowiskoPayload {
  nazwa: string;
  szerokosc: number;
  dlugosc: number;
  opis?: string;
}

// ── Planowane operacje ───────────────────────────────────────

export interface OperacjaListDto {
  id: number;
  numer: string;
  numerZleceniaProjektu: string;
  opisSkrocony: string;
  liczbaKmTrasy: number;
  rodzajeCzynnosci: string[];
  proponowanaDataOd?: string;
  proponowanaDataDo?: string;
  planowanaDataOd?: string;
  planowanaDataDo?: string;
  statusId: number;
  statusNazwa: string;
  kmlZawartosc?: string;
}

export interface OperacjaDto extends OperacjaListDto {
  kmlNazwaPliku?: string;
  dodatkoweInfo?: string;
  komentarz?: string;
  uwagiPoRealizacji?: string;
  wprowadzajacyId: number;
  wprowadzajacyEmail: string;
  rodzajeCzynnosciIds: number[];
  rodzajeCzynnosciNazwy: string[];
  punktyTrasy: PunktTrasyDto[];
  osobyKontaktoweIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface OperacjaPayload {
  numerZleceniaProjektu: string;
  opisSkrocony: string;
  liczbaKmTrasy: number;
  rodzajeCzynnosciIds: number[];
  proponowanaDataOd?: string | null;
  proponowanaDataDo?: string | null;
  planowanaDataOd?: string | null;
  planowanaDataDo?: string | null;
  dodatkoweInfo?: string | null;
  komentarz?: string | null;
  kmlNazwaPliku?: string | null;
  kmlZawartosc?: string | null;
  punktyTrasy: PunktTrasyDto[];
  osobyKontaktoweIds: number[];
}

export interface PunktTrasyDto {
  kolejnosc: number;
  szerokosc: number;
  dlugosc: number;
}

export interface KomentarzDto {
  id: number;
  tresc: string;
  autorEmail: string;
  createdAt: string;
}

export interface HistoriaZmianyDto {
  id: number;
  pole: string;
  staraWartosc?: string;
  nowaWartosc?: string;
  zmienionePrzezEmail: string;
  dataZmiany: string;
}

// ── Zlecenia na lot ──────────────────────────────────────────

export interface ZlecenieListDto {
  id: number;
  numer: string;
  planowanyStartDt: string;
  helikopterNr: string;
  pilotImieNazwisko: string;
  statusId: number;
  statusNazwa: string;
}

export interface OperacjaSkrotDto {
  id: number;
  numer: string;
  opisSkrocony: string;
  statusId: number;
  statusNazwa: string;
}

export interface ZlecenieDto {
  id: number;
  numer: string;
  planowanyStartDt: string;
  planowaneLadowanieDt: string;
  rzeczywistyStartDt?: string;
  rzeczywisteLadowanieDt?: string;
  pilotId: number;
  pilotImieNazwisko: string;
  helikopterId: number;
  helikopterNr: string;
  ladowiskoStartoweId: number;
  ladowiskoStartoweNazwa: string;
  ladowiskoKoncoweId: number;
  ladowiskoKoncoweNazwa: string;
  szacowanaDlugoscTrasy: number;
  wagaZalogiKg: number;
  statusId: number;
  statusNazwa: string;
  czlonkowieZalogiIds: number[];
  czlonkowieZalogiImiona: string[];
  operacje: OperacjaSkrotDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ZleceniePayload {
  planowanyStartDt: string;
  planowaneLadowanieDt: string;
  rzeczywistyStartDt?: string | null;
  rzeczywisteLadowanieDt?: string | null;
  helikopterId: number;
  pilotId: number;
  ladowiskoStartoweId: number;
  ladowiskoKoncoweId: number;
  szacowanaDlugoscTrasy: number;
  czlonkowieZalogiIds: number[];
  operacjeIds: number[];
}

// ── Mapa ─────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Pixel {
  x: number;
  y: number;
}

// ── Zapytania (query params) ─────────────────────────────────

export interface OperacjeQuery {
  statusId?: number;
  numerZlecenia?: string;
  planowanaOd?: string;
  planowanaDo?: string;
  strona?: number;
  rozmiarStrony?: number;
}

export interface ZleceniaQuery {
  statusId?: number;
  pilotId?: number;
  helikopterId?: number;
  startOd?: string;
  startDo?: string;
  strona?: number;
  rozmiarStrony?: number;
}
