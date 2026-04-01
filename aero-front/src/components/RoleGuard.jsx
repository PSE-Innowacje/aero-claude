import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Result } from 'antd';

/**
 * Ochrona trasy per rola.
 * Jeśli użytkownik nie ma wymaganej roli — przekieruj na dashboard.
 */
export default function RoleGuard({ roles, children }) {
  const { hasRole } = useAuth();

  if (!hasRole(...roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
