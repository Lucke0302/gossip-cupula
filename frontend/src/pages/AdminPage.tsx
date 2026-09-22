import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAdminAction, useAdminUsers } from '../hooks/useAdminUsers';
import { messageFor } from '../lib/errors';
import type { AdminUser } from '../services/admin.service';

const SECTIONS = [
  {
    key: 'welcome',
    label: 'welcome',
    color: 'text-welcome',
    description: 'quem entra, quem fica de fora. a porta é aqui.',
  },
  { key: 'fofocas', label: 'fofocas', color: 'text-fofocas', to: '/' },
  { key: 'fotos', label: 'fotos', color: 'text-fotos', to: '/fotos' },
  { key: 'links', label: 'links', color: 'text-links', to: '/links' },
];

function Etiqueta({ ok, sim, nao }: { ok: boolean; sim: string; nao: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-[2px] font-body text-[9.5px] uppercase leading-[1.6] tracking-[.06em] ${
        ok ? 'border-[#bcd6a8] text-[#4A731B]' : 'border-[#e0c9a0] text-[#9a6a10]'
      }`}
    >
      {ok ? sim : nao}
    </span>
  );
}

function LinhaUsuario({
  usuario,
  euSou,
  ocupado,
  agir,
}: {
  usuario: AdminUser;
  euSou: boolean;
  ocupado: boolean;
  agir: (acao: 'approve' | 'revoke' | 'delete') => void;
}) {
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  return (
    <li className="border-b border-dotted border-hairline-dot pb-4 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-body text-[13px] font-bold text-body">
          {usuario.username}
          {euSou ? <span className="ml-1.5 font-normal text-muted">(você)</span> : null}
        </span>
        {usuario.role.toLowerCase() === 'admin' ? (
          <span className="font-body text-[10.5px] uppercase tracking-[.06em] text-fofocas">
            admin
          </span>
        ) : null}
      </div>

      <p className="mt-0.5 font-body text-[11.5px] text-[#666]">{usuario.email}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Etiqueta ok={usuario.isEmailConfirmed} sim="e-mail ok" nao="e-mail pendente" />
        <Etiqueta ok={usuario.isApprovedByAdmin} sim="aprovado" nao="aguardando" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {usuario.isApprovedByAdmin ? (
          <Button variant="secondary" disabled={ocupado || euSou} onClick={() => agir('revoke')}>
            revogar
          </Button>
        ) : (
          <Button disabled={ocupado} onClick={() => agir('approve')}>
            aprovar
          </Button>
        )}

        {confirmandoExclusao ? (
          <>
            <span className="font-body text-[11px] text-[#c0392b]">excluir de vez?</span>
            <Button
              variant="secondary"
              disabled={ocupado}
              onClick={() => {
                setConfirmandoExclusao(false);
                agir('delete');
              }}
            >
              sim, some
            </Button>
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(false)}
              className="font-body text-[11px] text-link underline"
            >
              cancela
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={ocupado || euSou}
            onClick={() => setConfirmandoExclusao(true)}
            className="font-body text-[11px] text-[#c0392b] underline disabled:opacity-40"
          >
            excluir
          </button>
        )}
      </div>
    </li>
  );
}

export default function AdminPage() {
  const { role, nickname, status } = useAuth();
  const { push } = useToast();
  const souAdmin = role === 'admin';

  const usuarios = useAdminUsers(souAdmin);
  const acao = useAdminAction();

  // Esconder a tela é conveniência; quem barra de verdade é o 403 da API.
  if (status === 'authenticated' && !souAdmin) return <Navigate to="/" replace />;

  const agir = (id: string, tipo: 'approve' | 'revoke' | 'delete') => {
    const recados = {
      approve: 'entrada liberada.',
      revoke: 'acesso revogado. a sessão dela caiu.',
      delete: 'sumiu. os posts continuam lá, anônimos.',
    };

    acao.mutate(
      { id, acao: tipo },
      {
        onSuccess: () => push(recados[tipo], 'success'),
        onError: (erro) => push(messageFor(erro), 'error'),
      },
    );
  };

  const lista = usuarios.data ?? [];
  const aguardando = lista.filter((u) => !u.isApprovedByAdmin);
  const dentro = lista.filter((u) => u.isApprovedByAdmin);

  return (
    <Layout sections={SECTIONS}>
      <h1 className="mb-4 text-center font-display text-[28px] font-light text-fofocas">
        a porta da cúpula
      </h1>

      {usuarios.isPending ? (
        <Card padding="roomy">
          <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-2.5">
            <span className="sr-only">carregando a lista…</span>
            {[70, 90, 60].map((largura, i) => (
              <div
                key={i}
                className="skeleton-line h-[12px] animate-shimmer rounded-[3px]"
                style={{ width: `${largura}%` }}
              />
            ))}
          </div>
        </Card>
      ) : null}

      {usuarios.isError ? (
        <ErrorState error={usuarios.error} onRetry={() => void usuarios.refetch()} />
      ) : null}

      {usuarios.isSuccess ? (
        <div className="flex flex-col gap-4">
          <Card padding="roomy" as="section" aria-labelledby="aguardando-titulo">
            <h2
              id="aguardando-titulo"
              className="text-center font-serif text-[16px] leading-none text-[#222]"
            >
              batendo na porta ({aguardando.length})
            </h2>

            {aguardando.length === 0 ? (
              <p className="mt-4 text-center font-body text-[12px] text-[#8a8a80]">
                ninguém esperando. a cúpula está fechada e em dia.
              </p>
            ) : (
              <ul className="mt-4 flex list-none flex-col gap-4 p-0">
                {aguardando.map((usuario) => (
                  <LinhaUsuario
                    key={usuario.id}
                    usuario={usuario}
                    euSou={usuario.username === nickname}
                    ocupado={acao.isPending}
                    agir={(tipo) => agir(usuario.id, tipo)}
                  />
                ))}
              </ul>
            )}
          </Card>

          <Card padding="roomy" as="section" aria-labelledby="dentro-titulo">
            <h2
              id="dentro-titulo"
              className="text-center font-serif text-[16px] leading-none text-[#222]"
            >
              já são de casa ({dentro.length})
            </h2>
            <ul className="mt-4 flex list-none flex-col gap-4 p-0">
              {dentro.map((usuario) => (
                <LinhaUsuario
                  key={usuario.id}
                  usuario={usuario}
                  euSou={usuario.username === nickname}
                  ocupado={acao.isPending}
                  agir={(tipo) => agir(usuario.id, tipo)}
                />
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {usuarios.isSuccess && lista.length === 0 ? (
        <EmptyState
          glyph="0"
          title="nenhuma conta por aqui"
          description="nem você? isso é estranho o suficiente pra valer uma olhada no servidor."
        />
      ) : null}
    </Layout>
  );
}
