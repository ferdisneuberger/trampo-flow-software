import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';

type ErrorBoundaryProps = {
  children: ReactNode;
  resetKey?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Em produção, este é o ponto para integrar um serviço de telemetria.
    console.error('Erro inesperado na interface', error, info);
  }

  componentDidUpdate(previous: ErrorBoundaryProps): void {
    if (this.state.hasError && previous.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Card className="mx-auto flex max-w-xl flex-col items-center px-6 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-card bg-danger-soft text-danger">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-xl font-semibold text-fg">
          Algo deu errado
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted">
          Ocorreu um erro inesperado ao renderizar esta tela. Recarregue a
          página para tentar novamente.
        </p>
        <Button type="button" className="mt-6" onClick={this.handleReload}>
          Recarregar página
        </Button>
      </Card>
    );
  }
}
