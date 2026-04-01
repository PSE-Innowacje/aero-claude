import React from 'react';
import { Result, Button } from 'antd';

/**
 * Error Boundary — łapie nieobsłużone wyjątki w drzewie komponentów React.
 * Zamiast białego ekranu wyświetla czytelny komunikat z przyciskiem odświeżenia.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#080f1a', padding: 24,
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
