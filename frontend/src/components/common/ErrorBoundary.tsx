import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <div className="alert alert-danger max-w-lg text-center">
            <h3 className="text-lg font-bold mb-2">Une erreur est survenue</h3>
            <p className="mb-4">Veuillez rafraîchir la page ou réessayer plus tard.</p>
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
