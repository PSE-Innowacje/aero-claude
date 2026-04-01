import React, { type ReactNode } from 'react';
import { Result, Button } from 'antd';
import { palette } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: palette.bgDeep, padding: 24,
        }}>
          <Result
            status="error"
            title="Wystąpił nieoczekiwany błąd"
            subTitle="Aplikacja napotkała problem. Spróbuj odświeżyć stronę."
            extra={[
              <Button type="primary" key="refresh" onClick={() => window.location.reload()}>
                Odśwież stronę
              </Button>,
              <Button key="home" onClick={() => { window.location.href = '/'; }}>
                Strona główna
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
