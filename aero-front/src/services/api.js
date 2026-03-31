import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token management ──────────────────────────────────────────

const TOKEN_KEY  = 'loty_token';
const REFRESH_KEY = 'loty_refresh';
const USER_KEY   = 'loty_user';

export const tokenStore = {
  getToken:    () => sessionStorage.getItem(TOKEN_KEY),
  getRefresh:  () => sessionStorage.getItem(REFRESH_KEY),
  getUser:     () => { try { return JSON.parse(sessionStorage.getItem(USER_KEY)); } catch { return null; } },
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

// Dołącz token JWT do każdego żądania
api.interceptors.request.use(cfg => {
  const token = tokenStore.getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Automatyczny refresh przy 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else       prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  r => r,
  async err => {
    const originalRequest = err.config;

    // Nie próbuj refresh dla endpointów auth
    if (err.response?.status === 401
        && !originalRequest._retry
        && !originalRequest.url?.includes('/auth/')) {

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
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
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const result = data?.data ?? data;
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

// Odpakuj data.data (ApiResult<T>)
const unwrap = r => r.data?.data ?? r.data;

/**
 * Wyciąga czytelny komunikat błędu z odpowiedzi API.
 */
export const extractApiError = (err, fallback = 'Wystąpił nieoczekiwany błąd.') => {
  const data = err?.response?.data;

  if (data?.errors?.length) {
    return data.errors.join('\n');
  }

  if (typeof data?.errors === 'object' && !Array.isArray(data.errors)) {
    const msgs = Object.values(data.errors).flat();
    if (msgs.length) return msgs.join('\n');
  }

  if (data?.message) return data.message;
  if (data?.title)   return data.title;

  if (err?.response?.status === 429)
    return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.';

  if (err?.response?.status) {
    return `Błąd ${err.response.status}: ${err.response.statusText || 'nieznany błąd serwera'}`;
  }

  if (err?.message) return err.message;

  return fallback;
};

// ── Auth ──────────────────────────────────────────────────────

export const login = (email, haslo) =>
  api.post('/auth/login', { email, haslo }).then(unwrap);

export const refreshToken = (refreshToken) =>
  api.post('/auth/refresh', { refreshToken }).then(unwrap);

export const logout = (refreshToken) =>
  api.post('/auth/logout', { refreshToken }).then(() => {}).catch(() => {});

// ── Słowniki ──────────────────────────────────────────────────

export const getRoleUzytkownikow  = () => api.get('/slowniki/role-uzytkownikow').then(unwrap);
export const getRoleZalogi        = () => api.get('/slowniki/role-zalogi').then(unwrap);
export const getRodzajeCzynnosci  = () => api.get('/slowniki/rodzaje-czynnosci').then(unwrap);
export const getStatusyOperacji   = () => api.get('/slowniki/statusy-operacji').then(unwrap);
export const getStatusyZlecen     = () => api.get('/slowniki/statusy-zlecen').then(unwrap);

// ── Użytkownicy ───────────────────────────────────────────────

export const getUzytkownicy       = () => api.get('/uzytkownicy').then(unwrap);
export const getUzytkownicyKontakty = () => api.get('/operacje/osoby-kontaktowe').then(unwrap);
export const getUzytkownikById    = id => api.get(`/uzytkownicy/${id}`).then(unwrap);
export const createUzytkownik     = data => api.post('/uzytkownicy', data).then(unwrap);
export const updateUzytkownik     = (id, data) => api.put(`/uzytkownicy/${id}`, data);

// ── Helikoptery ───────────────────────────────────────────────

export const getHelikoptery       = () => api.get('/helikoptery').then(unwrap);
export const getHelikopterById    = id => api.get(`/helikoptery/${id}`).then(unwrap);
export const createHelikopter     = data => api.post('/helikoptery', data).then(unwrap);
export const updateHelikopter     = (id, data) => api.put(`/helikoptery/${id}`, data);

// ── Członkowie załogi ─────────────────────────────────────────

export const getCzlonkowie        = () => api.get('/czlonkowie-zalogi').then(unwrap);
export const getCzlonekById       = id => api.get(`/czlonkowie-zalogi/${id}`).then(unwrap);
export const createCzlonek        = data => api.post('/czlonkowie-zalogi', data).then(unwrap);
export const updateCzlonek        = (id, data) => api.put(`/czlonkowie-zalogi/${id}`, data);

// ── Lądowiska ─────────────────────────────────────────────────

export const getLadowiska         = () => api.get('/ladowiska').then(unwrap);
export const getLadowiskoById     = id => api.get(`/ladowiska/${id}`).then(unwrap);
export const createLadowisko      = data => api.post('/ladowiska', data).then(unwrap);
export const updateLadowisko      = (id, data) => api.put(`/ladowiska/${id}`, data);

// ── Planowane operacje ────────────────────────────────────────

export const getOperacje = (params = {}) =>
  api.get('/operacje', { params }).then(unwrap);

export const getOperacjaById = id =>
  api.get(`/operacje/${id}`).then(unwrap);

export const createOperacja = data =>
  api.post('/operacje', data).then(unwrap);

export const updateOperacja = (id, data) =>
  api.put(`/operacje/${id}`, data);

export const zmienStatusOperacji = (id, statusId, komentarz) =>
  api.post(`/operacje/${id}/status`, { statusId, komentarz });

export const getKomentarzeOperacji = id =>
  api.get(`/operacje/${id}/komentarze`).then(unwrap);

export const dodajKomentarzOperacji = (id, tresc) =>
  api.post(`/operacje/${id}/komentarze`, { tresc });

export const getHistoriaOperacji = id =>
  api.get(`/operacje/${id}/historia`).then(unwrap);

// ── Zlecenia na lot ───────────────────────────────────────────

export const getZlecenia = (params = {}) =>
  api.get('/zlecenia', { params }).then(unwrap);

export const getZlecenieById = id =>
  api.get(`/zlecenia/${id}`).then(unwrap);

export const createZlecenie = data =>
  api.post('/zlecenia', data).then(unwrap);

export const updateZlecenie = (id, data) =>
  api.put(`/zlecenia/${id}`, data);

export const zmienStatusZlecenia = (id, statusId) =>
  api.post(`/zlecenia/${id}/status`, { statusId });

export const getHistoriaZlecenia = id =>
  api.get(`/zlecenia/${id}/historia`).then(unwrap);
