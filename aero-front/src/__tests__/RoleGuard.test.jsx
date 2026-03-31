import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import RoleGuard from '../components/RoleGuard';

// Mock useAuth so we can control the role without a full AuthProvider
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';

function renderWithRouter(ui) {
  return render(<MemoryRouter initialEntries={['/protected']}>{ui}</MemoryRouter>);
}

describe('RoleGuard', () => {
  it('renders children when user has the required role', () => {
    useAuth.mockReturnValue({ hasRole: (...roles) => roles.includes('Admin') });
    renderWithRouter(
      <RoleGuard roles={['Admin']}>
        <span>Chroniona treść</span>
      </RoleGuard>
    );
    expect(screen.getByText('Chroniona treść')).toBeInTheDocument();
  });

  it('does NOT render children when user lacks the required role', () => {
    useAuth.mockReturnValue({ hasRole: () => false });
    renderWithRouter(
      <RoleGuard roles={['Admin']}>
        <span>Chroniona treść</span>
      </RoleGuard>
    );
    expect(screen.queryByText('Chroniona treść')).not.toBeInTheDocument();
  });

  it('accepts multiple allowed roles and grants access if any matches', () => {
    useAuth.mockReturnValue({ hasRole: (...roles) => roles.includes('Pilot') });
    renderWithRouter(
      <RoleGuard roles={['Admin', 'Pilot']}>
        <span>Cockpit</span>
      </RoleGuard>
    );
    expect(screen.getByText('Cockpit')).toBeInTheDocument();
  });

  it('redirects to "/" when user has none of the allowed roles', () => {
    useAuth.mockReturnValue({ hasRole: () => false });
    renderWithRouter(
      <RoleGuard roles={['Admin', 'Pilot']}>
        <span>Tajny panel</span>
      </RoleGuard>
    );
    expect(screen.queryByText('Tajny panel')).not.toBeInTheDocument();
  });
});
