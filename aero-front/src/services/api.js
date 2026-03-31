import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Dołącz token JWT do każdego żądania
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('loty_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Przy 401 wyczyść storage i przeładuj
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('loty_token');
      localStorage.removeItem('loty_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Odpakuj data.data (ApiResult<T>)
const unwrap = r => r.data?.data ?? r.data;

// ── Auth ──────────────────────────────────────────────────────

export const login = (email, haslo) =>
  api.post('/auth/login', { email, haslo }).then(unwrap);

// ── Słowniki ──────────────────────────────────────────────────

export const getRoleUzytkownikow  = () => api.get('/slowniki/role-uzytkownikow').then(unwrap);
export const getRoleZalogi        = () => api.get('/slowniki/role-zalogi').then(unwrap);
export const getRodzajeCzynnosci  = () => api.get('/slowniki/rodzaje-czynnosci').then(unwrap);
export const getStatusyOperacji   = () => api.get('/slowniki/statusy-operacji').then(unwrap);
export const getStatusyZlecen     = () => api.get('/slowniki/statusy-zlecen').then(unwrap);

// ── Użytkownicy ───────────────────────────────────────────────

export const getUzytkownicy       = () => api.get('/uzytkownicy').then(unwrap);
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
