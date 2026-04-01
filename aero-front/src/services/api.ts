import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type {
  ApiResult, PagedResult, LoginResponseDto, UzytkownikDto,
  HelikopterDto, CzlonekZalogiDto, LadowiskoDto, SlownikDto,
  OperacjaListDto, OperacjaDto, KomentarzDto, HistoriaZmianyDto,
  ZlecenieListDto, ZlecenieDto,
  OperacjeQuery, ZleceniaQuery,
  OperacjaPayload, ZleceniePayload, HelikopterPayload,
  CzlonekZalogiPayload, LadowiskoPayload, UzytkownikPayload,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

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

// ── Auth expiry event ────────────────────────────────────────
// Instead of window.location.href = '/login', we dispatch a custom event
// that AuthContext listens to, keeping navigation inside React Router.

export const AUTH_EXPIRED_EVENT = 'auth:expired';

function dispatchAuthExpired() {
  tokenStore.clear();
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

// ── Interceptors ──────────────────────────────────────────────

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = tokenStore.getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

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

      const refreshTokenValue = tokenStore.getRefresh();
      if (!refreshTokenValue) {
        dispatchAuthExpired();
        return Promise.reject(err);
      }

      try {
        const { data } = await axios.post<ApiResult<LoginResponseDto>>(
          `${API_BASE}/auth/refresh`, { refreshToken: refreshTokenValue }
        );
        const result = data?.data ?? (data as unknown as LoginResponseDto);
        tokenStore.set(result.token, result.refreshToken, result.uzytkownik);

        processQueue(null, result.token);
        originalRequest.headers.Authorization = `Bearer ${result.token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        dispatchAuthExpired();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (err.response?.status === 401) {
      dispatchAuthExpired();
    }

    return Promise.reject(err);
  }
);

// ── Helpers ───────────────────────────────────────────────────

function unwrap<T>(r: { data: ApiResult<T> }): T {
  return (r.data?.data ?? r.data) as T;
}

/** Extract a readable error message from an API response. */
export function extractApiError(err: unknown, fallback = 'Wystąpił nieoczekiwany błąd.'): string {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : fallback;
  }

  const data = err.response?.data as
    | { errors?: string[] | Record<string, string[]>; message?: string; title?: string }
    | undefined;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.join('\n');
  }

  if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    const msgs = Object.values(data.errors).flat();
    if (msgs.length) return msgs.join('\n');
  }

  if (data?.message) return data.message;
  if (data?.title)   return data.title;

  if (err.response?.status === 429)
    return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.';

  if (err.response?.status) {
    return `Błąd ${err.response.status}: ${err.response.statusText || 'nieznany błąd serwera'}`;
  }

  if (err.message) return err.message;

  return fallback;
}

// ── Auth ──────────────────────────────────────────────────────

export const login = (email: string, haslo: string): Promise<LoginResponseDto> =>
  api.post('/auth/login', { email, haslo }).then(unwrap);

export const refreshToken = (rt: string): Promise<LoginResponseDto> =>
  api.post('/auth/refresh', { refreshToken: rt }).then(unwrap);

export const logout = (rt: string): Promise<void> =>
  api.post('/auth/logout', { refreshToken: rt }).then(() => undefined).catch(() => undefined);

// ── Słowniki ──────────────────────────────────────────────────

export const getRoleUzytkownikow  = (): Promise<SlownikDto[]> => api.get('/slowniki/role-uzytkownikow').then(unwrap);
export const getRoleZalogi        = (): Promise<SlownikDto[]> => api.get('/slowniki/role-zalogi').then(unwrap);
export const getRodzajeCzynnosci  = (): Promise<SlownikDto[]> => api.get('/slowniki/rodzaje-czynnosci').then(unwrap);
export const getStatusyOperacji   = (): Promise<SlownikDto[]> => api.get('/slowniki/statusy-operacji').then(unwrap);
export const getStatusyZlecen     = (): Promise<SlownikDto[]> => api.get('/slowniki/statusy-zlecen').then(unwrap);

// ── Użytkownicy ───────────────────────────────────────────────

export const getUzytkownicy        = (signal?: AbortSignal): Promise<UzytkownikDto[]> =>
  api.get('/uzytkownicy', { signal }).then(unwrap);
export const getUzytkownicyKontakty = (signal?: AbortSignal): Promise<UzytkownikDto[]> =>
  api.get('/operacje/osoby-kontaktowe', { signal }).then(unwrap);
export const getUzytkownikById     = (id: number, signal?: AbortSignal): Promise<UzytkownikDto> =>
  api.get(`/uzytkownicy/${id}`, { signal }).then(unwrap);
export const createUzytkownik      = (data: UzytkownikPayload): Promise<number> =>
  api.post('/uzytkownicy', data).then(unwrap);
export const updateUzytkownik      = (id: number, data: UzytkownikPayload) =>
  api.put(`/uzytkownicy/${id}`, data);

// ── Helikoptery ───────────────────────────────────────────────

export const getHelikoptery    = (signal?: AbortSignal): Promise<HelikopterDto[]> =>
  api.get('/helikoptery', { signal }).then(unwrap);
export const getHelikopterById = (id: number, signal?: AbortSignal): Promise<HelikopterDto> =>
  api.get(`/helikoptery/${id}`, { signal }).then(unwrap);
export const createHelikopter  = (data: HelikopterPayload): Promise<number> =>
  api.post('/helikoptery', data).then(unwrap);
export const updateHelikopter  = (id: number, data: HelikopterPayload) =>
  api.put(`/helikoptery/${id}`, data);

// ── Członkowie załogi ─────────────────────────────────────────

export const getCzlonkowie  = (signal?: AbortSignal): Promise<CzlonekZalogiDto[]> =>
  api.get('/czlonkowie-zalogi', { signal }).then(unwrap);
export const getCzlonekById = (id: number, signal?: AbortSignal): Promise<CzlonekZalogiDto> =>
  api.get(`/czlonkowie-zalogi/${id}`, { signal }).then(unwrap);
export const createCzlonek  = (data: CzlonekZalogiPayload): Promise<number> =>
  api.post('/czlonkowie-zalogi', data).then(unwrap);
export const updateCzlonek  = (id: number, data: CzlonekZalogiPayload) =>
  api.put(`/czlonkowie-zalogi/${id}`, data);

// ── Lądowiska ─────────────────────────────────────────────────

export const getLadowiska    = (signal?: AbortSignal): Promise<LadowiskoDto[]> =>
  api.get('/ladowiska', { signal }).then(unwrap);
export const getLadowiskoById = (id: number, signal?: AbortSignal): Promise<LadowiskoDto> =>
  api.get(`/ladowiska/${id}`, { signal }).then(unwrap);
export const createLadowisko = (data: LadowiskoPayload): Promise<number> =>
  api.post('/ladowiska', data).then(unwrap);
export const updateLadowisko = (id: number, data: LadowiskoPayload) =>
  api.put(`/ladowiska/${id}`, data);

// ── Planowane operacje ────────────────────────────────────────

export const getOperacje = (params: OperacjeQuery = {}, signal?: AbortSignal): Promise<PagedResult<OperacjaListDto>> =>
  api.get('/operacje', { params, signal }).then(unwrap);

export const getOperacjaById = (id: number, signal?: AbortSignal): Promise<OperacjaDto> =>
  api.get(`/operacje/${id}`, { signal }).then(unwrap);

export const createOperacja = (data: OperacjaPayload): Promise<number> =>
  api.post('/operacje', data).then(unwrap);

export const updateOperacja = (id: number, data: OperacjaPayload) =>
  api.put(`/operacje/${id}`, data);

export const zmienStatusOperacji = (id: number, statusId: number, komentarz?: string) =>
  api.post(`/operacje/${id}/status`, { statusId, komentarz });

export const getKomentarzeOperacji = (id: number, signal?: AbortSignal): Promise<KomentarzDto[]> =>
  api.get(`/operacje/${id}/komentarze`, { signal }).then(unwrap);

export const dodajKomentarzOperacji = (id: number, tresc: string) =>
  api.post(`/operacje/${id}/komentarze`, { tresc });

export const getHistoriaOperacji = (id: number, signal?: AbortSignal): Promise<HistoriaZmianyDto[]> =>
  api.get(`/operacje/${id}/historia`, { signal }).then(unwrap);

// ── Zlecenia na lot ───────────────────────────────────────────

export const getZlecenia = (params: ZleceniaQuery = {}, signal?: AbortSignal): Promise<PagedResult<ZlecenieListDto>> =>
  api.get('/zlecenia', { params, signal }).then(unwrap);

export const getZlecenieById = (id: number, signal?: AbortSignal): Promise<ZlecenieDto> =>
  api.get(`/zlecenia/${id}`, { signal }).then(unwrap);

export const createZlecenie = (data: ZleceniePayload): Promise<number> =>
  api.post('/zlecenia', data).then(unwrap);

export const updateZlecenie = (id: number, data: ZleceniePayload) =>
  api.put(`/zlecenia/${id}`, data);

export const zmienStatusZlecenia = (id: number, statusId: number) =>
  api.post(`/zlecenia/${id}/status`, { statusId });

export const getHistoriaZlecenia = (id: number, signal?: AbortSignal): Promise<HistoriaZmianyDto[]> =>
  api.get(`/zlecenia/${id}/historia`, { signal }).then(unwrap);
