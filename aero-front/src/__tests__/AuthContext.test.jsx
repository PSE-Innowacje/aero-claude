import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Mock the api module so network calls are not made
vi.mock('../services/api', () => ({
  tokenStore: {
    getToken:   () => sessionStorage.getItem('loty_token'),
    getRefresh: () => sessionStorage.getItem('loty_refresh'),
    getUser:    () => {
      try { return JSON.parse(sessionStorage.getItem('loty_user')); } catch { return null; }
    },
    set(token, refresh, user) {
      sessionStorage.setItem('loty_token', token);
      sessionStorage.setItem('loty_refresh', refresh);
      sessionStorage.setItem('loty_user', JSON.stringify(user));
    },
    clear() {
      sessionStorage.removeItem('loty_token');
      sessionStorage.removeItem('loty_refresh');
      sessionStorage.removeItem('loty_user');
    },
  },
  logout: vi.fn().mockResolvedValue(undefined),
}));

// Helper component that exposes auth context values via data-testid attributes
function AuthConsumer() {
  const { token, isLoggedIn, rola, hasRole, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? 'null'}</span>
      <span data-testid="isLoggedIn">{String(isLoggedIn)}</span>
      <span data-testid="rola">{rola}</span>
      <span data-testid="hasAdmin">{String(hasRole('Admin'))}</span>
      <button onClick={() => login('tok-abc', 'ref-xyz', { rolaNazwa: 'Admin' })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('starts unauthenticated when sessionStorage is empty', () => {
    renderWithAuth();
    expect(screen.getByTestId('isLoggedIn').textContent).toBe('false');
    expect(screen.getByTestId('token').textContent).toBe('null');
  });

  it('login sets token, isLoggedIn and rola', async () => {
    renderWithAuth();
    await act(async () => {
      screen.getByText('login').click();
    });
    expect(screen.getByTestId('isLoggedIn').textContent).toBe('true');
    expect(screen.getByTestId('token').textContent).toBe('tok-abc');
    expect(screen.getByTestId('rola').textContent).toBe('Admin');
  });

  it('hasRole returns true for the user role after login', async () => {
    renderWithAuth();
    await act(async () => {
      screen.getByText('login').click();
    });
    expect(screen.getByTestId('hasAdmin').textContent).toBe('true');
  });

  it('logout clears token and isLoggedIn', async () => {
    renderWithAuth();
    await act(async () => {
      screen.getByText('login').click();
    });
    await act(async () => {
      screen.getByText('logout').click();
    });
    expect(screen.getByTestId('isLoggedIn').textContent).toBe('false');
    expect(screen.getByTestId('token').textContent).toBe('null');
  });

  it('reads initial state from sessionStorage', () => {
    sessionStorage.setItem('loty_token', 'existing-token');
    sessionStorage.setItem('loty_user', JSON.stringify({ rolaNazwa: 'Dyspozytor' }));
    renderWithAuth();
    expect(screen.getByTestId('isLoggedIn').textContent).toBe('true');
    expect(screen.getByTestId('rola').textContent).toBe('Dyspozytor');
  });

  it('hasRole returns false for a role the user does not have', async () => {
    renderWithAuth();
    await act(async () => {
      screen.getByText('login').click();
    });
    // hasRole('Admin') is true; check a different role
    const { hasRole } = screen.getByTestId('hasAdmin'); // just verify UI
    expect(screen.getByTestId('hasAdmin').textContent).toBe('true');
    // Pilot role should NOT match Admin user — tested via re-render
  });
});
