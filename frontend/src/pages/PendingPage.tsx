import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { messageFor } from '../lib/errors';
import { confirmEmail } from '../services/auth.service';

/**
 * Conta criada, mas ainda sem passe.
 *
 * O backend exige duas coisas antes de liberar o login: e-mail
 * confirmado e aprovação de um admin. A tela mostra as duas como o que
 * são — uma que a pessoa resolve agora, outra que depende de alguém.
 */
export default function PendingPage() {
  const location = useLocation();
  const { push } = useToast();
  const email = (location.state as { email?: string } | null)?.email ?? '';

  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Sem e-mail no estado, alguém chegou aqui digitando a URL.
  if (!email) return <Navigate to="/cadastro" replace />;

  const confirmar = async () => {
    setEnviando(true);
    try {
      await confirmEmail(email);
      setConfirmado(true);
      push('e-mail confirmado. falta a aprovação.', 'success');
    } catch (error) {
      push(messageFor(error), 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Layout bare wordmark="page">
      <div className="mx-auto w-full max-w-[464px]">
        <Card padding="roomy" as="section">
          <h1 className="text-center font-serif text-[19px] leading-[1.3] text-[#222]">
            a cúpula recebeu seu pedido
          </h1>
          <p className="mt-2 text-center font-body text-post text-[#555]">
            sua conta existe, mas ainda não abre a porta. faltam duas coisas:
          </p>

          <ol className="mt-5 flex list-none flex-col gap-4 p-0">
            <li className="border-b border-dotted border-hairline-dot pb-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-body text-[13px] font-bold text-body">
                  1. confirmar o e-mail
                </span>
                <span className="font-body text-[11px] text-muted">
                  {confirmado ? 'feito ✓' : 'pendente'}
                </span>
              </div>
              <p className="mt-1.5 font-body text-[12px] leading-[1.4] text-[#666]">
                {email}
              </p>
              {!confirmado ? (
                <div className="mt-3">
                  <Button onClick={() => void confirmar()} disabled={enviando}>
                    {enviando ? 'confirmando…' : 'confirmar agora'}
                  </Button>
                  <p className="mt-2 font-body text-[10.5px] leading-[1.4] text-muted">
                    nenhum e-mail é enviado hoje — o servidor só marca a conta como confirmada.
                  </p>
                </div>
              ) : null}
            </li>

            <li>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-body text-[13px] font-bold text-body">
                  2. aprovação de um admin
                </span>
                <span className="font-body text-[11px] text-muted">com eles</span>
              </div>
              <p className="mt-1.5 font-body text-[12px] leading-[1.4] text-[#666]">
                alguém da cúpula precisa liberar sua entrada. não tem como apressar — é meio que o
                ponto.
              </p>
            </li>
          </ol>

          <p className="mt-6 text-center font-body text-[12px] leading-[1.6] text-[#666]">
            liberaram?{' '}
            <Link to="/login" className="text-link">
              tenta entrar
            </Link>
          </p>
        </Card>
      </div>
    </Layout>
  );
}
