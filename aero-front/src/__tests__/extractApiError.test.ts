import { describe, it, expect } from 'vitest';
import { extractApiError } from '../services/api';

describe('extractApiError', () => {
  it('extracts errors from array (ApiResult.errors)', () => {
    const err = {
      response: {
        data: { success: false, errors: ['Email jest wymagany.', 'Hasło jest wymagane.'] },
        status: 400,
      },
    };
    expect(extractApiError(err)).toBe('Email jest wymagany.\nHasło jest wymagane.');
  });

  it('extracts errors from object (FluentValidation format)', () => {
    const err = {
      response: {
        data: {
          errors: {
            Email: ['Nieprawidłowy format adresu email.'],
            Haslo: ['Hasło musi mieć co najmniej 8 znaków.', 'Wymagana wielka litera.'],
          },
        },
        status: 400,
      },
    };
    const result = extractApiError(err);
    expect(result).toContain('Nieprawidłowy format adresu email.');
    expect(result).toContain('Hasło musi mieć co najmniej 8 znaków.');
    expect(result).toContain('Wymagana wielka litera.');
  });

  it('extracts message field', () => {
    const err = {
      response: {
        data: { message: 'Zasób nie istnieje.' },
        status: 404,
      },
    };
    expect(extractApiError(err)).toBe('Zasób nie istnieje.');
  });

  it('extracts title field (ProblemDetails format)', () => {
    const err = {
      response: {
        data: { title: 'One or more validation errors occurred.' },
        status: 400,
      },
    };
    expect(extractApiError(err)).toBe('One or more validation errors occurred.');
  });

  it('handles 429 Too Many Requests', () => {
    const err = {
      response: { data: {}, status: 429, statusText: 'Too Many Requests' },
    };
    expect(extractApiError(err)).toBe('Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.');
  });

  it('falls back to status code and text', () => {
    const err = {
      response: { data: {}, status: 500, statusText: 'Internal Server Error' },
    };
    expect(extractApiError(err)).toBe('Błąd 500: Internal Server Error');
  });

  it('falls back to error message', () => {
    const err = { message: 'Network Error' };
    expect(extractApiError(err)).toBe('Network Error');
  });

  it('returns custom fallback for unknown errors', () => {
    expect(extractApiError(null, 'Niestandardowy komunikat.')).toBe('Niestandardowy komunikat.');
    expect(extractApiError(undefined)).toBe('Wystąpił nieoczekiwany błąd.');
    expect(extractApiError({})).toBe('Wystąpił nieoczekiwany błąd.');
  });

  it('prioritizes errors array over message', () => {
    const err = {
      response: {
        data: {
          errors: ['Błąd walidacji.'],
          message: 'Ogólny komunikat.',
        },
        status: 400,
      },
    };
    expect(extractApiError(err)).toBe('Błąd walidacji.');
  });

  it('handles empty errors array gracefully', () => {
    const err = {
      response: {
        data: { errors: [], message: 'Fallback message.' },
        status: 400,
      },
    };
    expect(extractApiError(err)).toBe('Fallback message.');
  });
});
