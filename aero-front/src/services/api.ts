import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type {
  ApiResult, PagedResult, LoginResponseDto, UzytkownikDto,
  HelikopterDto, CzlonekZalogiDto, LadowiskoDto, SlownikDto,
  OperacjaListDto, OperacjaDto, KomentarzDto, HistoriaZmianyDto,
  ZlecenieListDto, ZlecenieDto,
  OperacjeQuery, ZleceniaQuery,
} from '../types/api';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token management ──────────────────────────────────────────

const TOKEN_KEY  = 'loty_token';
const REFRESH_KEY = 'loty_refresh';
const USER_KEY   = 'loty_user';

export interface TokenStore {
  getToken():  string | null;
  getRefresh(): string | null;
  getUser():   UzytkownikDto | null;
  set(token: string, refresh: string, user: UzytkownikDto): void;
  clear(): void;
}

export const tokenStore: TokenStore = {
  getToken:   () => sessionStorage.getItem(TOKEN_KEY),
  getRefresh: () => sessionStorage.getItem(REFRESH_KEY),
  getUser:    () => {
    try { return JSON.parse(sessionStorage.getItem(USER_KEY) ?? 'null'); }
    catch { return null; }
  },
  set(token, refresh, user) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(REFRESH_KEY, refresh);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};

// ── Interceptors ──────────────────────────────────────────────

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = tokenStore.getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Automatyczny refresh przy 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else       prom.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  r => r,
  async (err: AxiosError) => {
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!originalRequest) return Promise.reject(err);

    if (err.response?.status === 401
        && !originalRequest._retry
        && !originalRequest.url?.includes('/auth/')) {

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      }

      try {
        const { data } = await axios.post<ApiResult<LoginResponseDto>>(
          `${API_BASE}/auth/refresh`, { refreshToken }
        );
        const result = data?.data ?? (data as unknown as LoginResponseDto);
        tokenStore.set(result.token, result.refreshToken, result.uzytkownik);

        processQueue(null, result.token);
        originalRequest.headers.Authorization = `Bearer ${result.token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (err.response?.status === 401) {
      tokenStore.clear();
      window.location.href = '/login';
    }

    return Promise.reject(err);
  }
);

// ── Helpers ───────────────────────────────────────────────────

/** Odpakuj data.data (ApiResult<T>) */
function unwrap<T>(r: { data: ApiResult<T> }): T {
  return (r.data?.data ?? r.data) as T;
}

/** Wyciąga czytelny komunikat błędu z odpowiedzi API. */
export const extractApiError = (err: unknown, fallback = 'Wystąpił nieoczekiwany błąd.'): string => {
  const axErr = err as AxiosError<{ errors?: string[] | Record<string, string[]>; message?: string; title?: string }>;
  const data = axErr?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.join('\n');
  }

  if (typeof data?.errors === 'object' && !Array.isArray(data.errors)) {
    const msgs = Object.values(data.errors).flat();
    if (msgs.length) return msgs.join('\n');
  }

  if (data?.message) return data.message;
  if (data?.title)   return data.title;

  if (axErr?.response?.status === 429)
    return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.';

  if (axErr?.response?.status) {
    return `Błąd ${axErr.response.status}: ${axErr.response.statusText || 'nieznany błąd serwera'}`;
  }

  if (axErr?.message) return axErr.message;

  return fallback;
};

// ── Auth ──────────────────────────────────────────────────────

export const login = (email: string, haslo: string): Promise<LoginResponseDto> =>
  api.post('/auth/login', { email, haslo }).then(unwrap);

export const refreshToken = (refreshToken: string): Promise<LoginResponseDto> =>
  api.post('/auth/refresh', { refreshToken }).then(unwrap);

export const logout = (refreshToken: string): Promise<void> =>
  api.post('/auth/logout', { refreshToken }).then(() => {}).catch(() => {});

// ── Słowniki ──────────────────────────────────────────────────

export const getRoleUzytkownikow  = (): Promise<SlownikDto[]> => api.get('/slowniki/role-uzytkownikow').then(unwrap);
export const getRoleZalogi        = (): Promise<SlownikDto[]> => api.get('/slowniki/role-zalogi').then(unwrap);
export const getRodzajeCzynnosci  = (): Promise<SlownikDto[]> => api.get('/slowniki/rodzaje-czynnosci').then(unwrap);
export const getStatusyOperacji   = (): Promise<SlownikDto[]> => api.get('/slowniki/statusy-operacji').then(unwrap);
export const getStatusyZlecen     = (): Promise<SlownikDto[]> => api.get('/slowniki/statusy-zlecen').then(unwrap);

// ── Użytkownicy ───────────────────────────────────────────────

export const getUzytkownicy        = (): Promise<UzytkownikDto[]> => api.get('/uzytkownicy').then(unwrap);
export const getUzytkownicyKontakty = (): Promise<UzytkownikDto[]> => api.get('/operacje/osoby-kontaktowe').then(unwrap);
export const getUzytkownikById     = (id: number): Promise<UzytkownikDto> => api.get(`/uzytkownicy/${id}`).then(unwrap);
export const createUzytkownik      = (data: Record<string, unknown>): Promise<number> => api.post('/uzytkownicy', data).then(unwrap);
export const updateUzytkownik      = (id: number, data: Record<string, unknown>) => api.put(`/uzytkownicy/${id}`, data);

// ── Helikoptery ───────────────────────────────────────────────

export const getHelikoptery    = (): Promise<HelikopterDto[]> => api.get('/helikoptery').then(unwrap);
export const getHelikopterById = (id: number): Promise<HelikopterDto> => api.get(`/helikoptery/${id}`).then(unwrap);
export const createHelikopter  = (data: Record<string, unknown>): Promise<number> => api.post('/helikoptery', data).then(unwrap);
export const updateHelikopter  = (id: number, data: Record<string, unknown>) => api.put(`/helikoptery/${id}`, data);

// ── Członkowie załogi ─────────────────────────────────────────

export const getCzlonkowie  = (): Promise<CzlonekZalogiDto[]> => api.get('/czlonkowie-zalogi').then(unwrap);
export const getCzlonekById = (id: number): Promise<CzlonekZalogiDto> => api.get(`/czlonkowie-zalogi/${id}`).then(unwrap);
export const createCzlonek  = (data: Record<string, unknown>): Promise<number> => api.post('/czlonkowie-zalogi', data).then(unwrap);
export const updateCzlonek  = (id: number, data: Record<string, unknown>) => api.put(`/czlonkowie-zalogi/${id}`, data);

// ── Lądowiska ─────────────────────────────────────────────────

export const getLadowiska    = (): Promise<LadowiskoDto[]> => api.get('/ladowiska').then(unwrap);
export const getLadowiskoById = (id: number): Promise<LadowiskoDto> => api.get(`/ladowiska/${id}`).then(unwrap);
export const createLadowisko = (data: Record<string, unknown>): Promise<number> => api.post('/ladowiska', data).then(unwrap);
export const updateLadowisko = (id: number, data: Record<string, unknown>) => api.put(`/ladowiska/${id}`, data);

// ── Planowane operacje ────────────────────────────────────────

export const getOperacje = (params: OperacjeQuery = {}): Promise<PagedResult<OperacjaListDto>> =>
  api.get('/operacje', { params }).then(unwrap);

export const getOperacjaById = (id: number): Promise<OperacjaDto> =>
  api.get(`/operacje/${id}`).then(unwrap);

export const createOperacja = (data: Record<string, unknown>): Promise<number> =>
  api.post('/operacje', data).then(unwrap);

export const updateOperacja = (id: number, data: Record<string, unknown>) =>
  api.put(`/operacje/${id}`, data);

export const zmienStatusOperacji = (id: number, statusId: number, komentarz?: string) =>
  api.post(`/operacje/${id}/status`, { statusId, komentarz });

export const getKomentarzeOperacji = (id: number): Promise<KomentarzDto[]> =>
  api.get(`/operacje/${id}/komentarze`).then(unwrap);

export const dodajKomentarzOperacji = (id: number, tresc: string) =>
  api.post(`/operacje/${id}/komentarze`, { tresc });

export const getHistoriaOperacji = (id: number): Promise<HistoriaZmianyDto[]> =>
  api.get(`/operacje/${id}/historia`).then(unwrap);

// ── Zlecenia na lot ───────────────────────────────────────────

export const getZlecenia = (params: ZleceniaQuery = {}): Promise<PagedResult<ZlecenieListDto>> =>
  api.get('/zlecenia', { params }).then(unwrap);

export const getZlecenieById = (id: number): Promise<ZlecenieDto> =>
  api.get(`/zlecenia/${id}`).then(unwrap);

export const createZlecenie = (data: Record<string, unknown>): Promise<number> =>
  api.post('/zlecenia', data).then(unwrap);

export const updateZlecenie = (id: number, data: Record<string, unknown>) =>
  api.put(`/zlecenia/${id}`, data);

export const zmienStatusZlecenia = (id: number, statusId: number) =>
  api.post(`/zlecenia/${id}/status`, { statusId });

export const getHistoriaZlecenia = (id: number): Promise<HistoriaZmianyDto[]> =>
  api.get(`/zlecenia/${id}/historia`).then(unwrap);
