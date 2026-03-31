import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractApiError, tokenStore } from '../services/api';

// ── tokenStore ────────────────────────────────────────────────────

describe('tokenStore', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('stores and retrieves the access token', () => {
    tokenStore.set('tok123', 'ref456', { rolaNazwa: 'Admin' });
    expect(tokenStore.getToken()).toBe('tok123');
  });

  it('stores and retrieves the refresh token', () => {
    tokenStore.set('tok', 'ref999', { rolaNazwa: 'Pilot' });
    expect(tokenStore.getRefresh()).toBe('ref999');
  });

  it('stores and retrieves the user object', () => {
    const user = { id: 1, rolaNazwa: 'Dyspozytor' };
    tokenStore.set('t', 'r', user);
    expect(tokenStore.getUser()).toEqual(user);
  });

  it('returns null for getToken when not set', () => {
    expect(tokenStore.getToken()).toBeNull();
  });

  it('returns null for getUser when not set', () => {
    expect(tokenStore.getUser()).toBeNull();
  });

  it('returns null for getUser when stored value is invalid JSON', () => {
    sessionStorage.setItem('loty_user', '{broken json');
    expect(tokenStore.getUser()).toBeNull();
  });

  it('clears all stored values', () => {
    tokenStore.set('tok', 'ref', { rolaNazwa: 'Admin' });
    tokenStore.clear();
    expect(tokenStore.getToken()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
    expect(tokenStore.getUser()).toBeNull();
  });
});

// ── extractApiError ───────────────────────────────────────────────

describe('extractApiError', () => {
  it('returns default message for null/undefined error', () => {
    expect(extractApiError(null)).toBe('Wystąpił nieoczekiwany błąd.');
    expect(extractApiError(undefined)).toBe('Wystąpił nieoczekiwany błąd.');
  });

  it('accepts a custom fallback message', () => {
    expect(extractApiError(null, 'Coś poszło nie tak')).toBe('Coś poszło nie tak');
  });

  it('joins errors array from response.data.errors', () => {
    const err = { response: { data: { errors: ['Pole wymagane', 'Zbyt długie'] } } };
    expect(extractApiError(err)).toBe('Pole wymagane\nZbyt długie');
  });

  it('flattens errors object from response.data.errors', () => {
    const err = {
      response: {
        data: {
          errors: { Imie: ['Za krótkie', 'Wymagane'], Haslo: ['Za słabe'] },
        },
      },
    };
    const result = extractApiError(err);
    expect(result).toContain('Za krótkie');
    expect(result).toContain('Wymagane');
    expect(result).toContain('Za słabe');
  });

  it('returns data.message when present', () => {
    const err = { response: { data: { message: 'Nieprawidłowe dane' } } };
    expect(extractApiError(err)).toBe('Nieprawidłowe dane');
  });

  it('returns data.title when message is absent', () => {
    const err = { response: { data: { title: 'Bad Request' } } };
    expect(extractApiError(err)).toBe('Bad Request');
  });

  it('returns rate-limit message for HTTP 429', () => {
    const err = { response: { status: 429, data: {} } };
    expect(extractApiError(err)).toBe('Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.');
  });

  it('returns HTTP status message for generic HTTP errors', () => {
    const err = { response: { status: 500, statusText: 'Internal Server Error', data: {} } };
    expect(extractApiError(err)).toBe('Błąd 500: Internal Server Error');
  });

  it('returns HTTP status message with fallback statusText when absent', () => {
    const err = { response: { status: 503, data: {} } };
    expect(extractApiError(err)).toBe('Błąd 503: nieznany błąd serwera');
  });

  it('returns err.message for network errors without response', () => {
    const err = { message: 'Network Error' };
    expect(extractApiError(err)).toBe('Network Error');
  });
});
