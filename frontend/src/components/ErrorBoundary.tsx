import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card } from './Card';
import { Button } from './ui';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Rede de seguranca da arvore inteira. Erro de render nao pode virar
 * tela preta — nesse visual, tela preta e' quase indistinguivel de
 * "funcionando".
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="bokeh min-h-screen px-4 py-16">
        <div className="mx-auto w-full max-w-[420px]">
          <Card padding="none" className="px-6 py-8 text-center">
            <p className="font-serif text-[17px] text-[#222]">a fonte se enrolou</p>
            <p className="mt-[9px] font-body text-post text-[#555]">
              alguma coisa quebrou do lado de cá. recarrega a página — e se insistir, avisa quem
              cuida do servidor.
            </p>
            {import.meta.env.DEV ? (
              <pre className="mt-3 overflow-x-auto rounded bg-[#f6f6ef] p-2 text-left font-mono text-[10px] text-[#8b3a2f]">
                {error.message}
              </pre>
            ) : null}
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={this.reset}>tentar de novo</Button>
              <Button variant="secondary" onClick={() => window.location.assign('/')}>
                voltar pro feed
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }
}
