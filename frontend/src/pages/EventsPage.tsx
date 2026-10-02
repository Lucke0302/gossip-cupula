import { useMemo, useState } from 'react';
import { CalendarGrid } from '../components/CalendarGrid';
import { Card } from '../components/Card';
import { ErrorState } from '../components/ErrorState';
import { EventDetailCard } from '../components/EventDetailCard';
import { Layout } from '../components/Layout';
import { UpcomingEvents } from '../components/UpcomingEvents';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  useCreateEvent,
  useDeleteEvent,
  useEvents,
  useToggleGoing,
} from '../hooks/useEvents';
import {
  chaveDoMes,
  mesVizinho,
  montarGrade,
  nomeDoMes,
} from '../lib/calendar';
import { messageFor } from '../lib/errors';

const SECTIONS = [
  { key: 'welcome', label: 'welcome', color: 'text-welcome', to: '/' },
  { key: 'fofocas', label: 'fofocas', color: 'text-fofocas', to: '/' },
  { key: 'fotos', label: 'fotos', color: 'text-fotos', to: '/fotos' },
  {
    key: 'eventos',
    label: 'eventos',
    color: 'text-eventos',
    description:
      'onde a cúpula vai estar — e onde ela diz que não vai. cada estrelinha é um compromisso que alguém vai fingir que esqueceu.',
  },
  { key: 'links', label: 'links', color: 'text-links', to: '/links' },
];

export default function EventsPage() {
  const { isAuthenticated, nickname } = useAuth();
  const { push } = useToast();

  const [mesCorrente, setMesCorrente] = useState(() => {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), 1);
  });
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const chaveMes = chaveDoMes(mesCorrente);
  const eventos = useEvents(chaveMes, isAuthenticated);
  const fixar = useCreateEvent(chaveMes);
  const desfixar = useDeleteEvent(chaveMes);
  const confirmar = useToggleGoing(chaveMes);

  const celulas = useMemo(() => montarGrade(mesCorrente), [mesCorrente]);

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, (typeof lista)[number]>();
    const lista = eventos.data?.items ?? [];
    for (const evento of lista) mapa.set(evento.date, evento);
    return mapa;
  }, [eventos.data]);

  // Sem escolha explícita, abre no primeiro dia do mês que tem estrela —
  // ou no dia 1. Assim a tela nunca aparece com o cartão de baixo vazio.
  const chaveSelecionada =
    selecionado ??
    eventos.data?.items[0]?.date ??
    celulas.find((celula) => celula.chave !== null)?.chave ??
    null;

  const eventoSelecionado = chaveSelecionada
    ? eventosPorDia.get(chaveSelecionada)
    : undefined;

  const ocupado = fixar.isPending || desfixar.isPending || confirmar.isPending;

  const trocarMes = (passo: number) => {
    setMesCorrente((atual) => mesVizinho(atual, passo));
    setSelecionado(null);
  };

  const proximos = [...(eventos.data?.items ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const sections = SECTIONS.map((secao) =>
    secao.key === 'eventos'
      ? secao
      : secao,
  );

  return (
    <Layout
      sections={sections}
      width="wide"
      sidebarExtra={<UpcomingEvents eventos={proximos} onEscolher={setSelecionado} />}
      sidebarExtraAfter="eventos"
    >
      <div className="flex flex-col gap-4.5">
        {eventos.isError ? (
          <ErrorState error={eventos.error} onRetry={() => void eventos.refetch()} />
        ) : null}

        {/* Papel pautado: listras de 24px, como caderno. */}
        <Card
          padding="none"
          className="px-3.5 pb-3 pt-3.5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg,transparent 0 23px,rgba(107,185,232,.13) 23px 24px)',
          }}
        >
          <div className="flex items-end justify-between gap-2 px-1.5 pb-1.5">
            <button
              type="button"
              onClick={() => trocarMes(-1)}
              className="font-body text-[11px] text-link underline"
            >
              « {nomeDoMes(mesVizinho(mesCorrente, -1))}
            </button>

            <div className="text-center">
              <h1
                className="font-hand text-[44px] leading-[0.8] text-[#222] sm:text-[60px]"
                style={{ transform: 'rotate(-2deg)' }}
              >
                {nomeDoMes(mesCorrente)}
              </h1>
              {/* O risco rosa desenhado embaixo do mês. */}
              <div
                aria-hidden="true"
                className="mx-auto mt-0.5 h-1.5 w-[150px] border-b-2 border-eventos"
                style={{
                  borderRadius: '0 0 60% 40%/0 0 100% 100%',
                  transform: 'rotate(-1.5deg)',
                }}
              />
              <p className="mt-[5px] font-body text-[10px] leading-none tracking-[.08em] text-muted">
                {mesCorrente.getFullYear()} · {proximos.length}{' '}
                {proximos.length === 1 ? 'estrelinha fixada' : 'estrelinhas fixadas'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => trocarMes(1)}
              className="font-body text-[11px] text-link underline"
            >
              {nomeDoMes(mesVizinho(mesCorrente, 1))} »
            </button>
          </div>

          <div className="mt-2" aria-busy={eventos.isPending}>
            <CalendarGrid
              celulas={celulas}
              eventosPorDia={eventosPorDia}
              selecionado={chaveSelecionada}
              onSelecionar={setSelecionado}
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-1 pt-2.5">
            <p
              className="font-hand text-[19px] leading-none text-[#777]"
              style={{ transform: 'rotate(-1deg)' }}
            >
              psiu: estrela rosa = vale a pena ir de penetra
            </p>
            <span aria-hidden="true" className="font-body text-[10px] tracking-[.04em] text-[#7aa8d8]">
              xoxo, cúpula
            </span>
          </div>
        </Card>

        {chaveSelecionada ? (
          <EventDetailCard
            chaveDoDiaSelecionado={chaveSelecionada}
            evento={eventoSelecionado}
            nickname={nickname}
            ocupado={ocupado}
            onFixar={({ titulo, hora, local, cor, assinar }) =>
              fixar.mutate(
                {
                  date: chaveSelecionada,
                  title: titulo,
                  time: hora,
                  place: local,
                  color: cor,
                  signed: assinar,
                },
                {
                  onSuccess: () => push('estrelinha fixada. agora é compromisso.', 'success'),
                  onError: (erro) => push(messageFor(erro), 'error'),
                },
              )
            }
            onDesfixar={(id) =>
              desfixar.mutate(id, {
                onSuccess: () => push('desfixado. nunca esteve no calendário.', 'success'),
                onError: (erro) => push(messageFor(erro), 'error'),
              })
            }
            onConfirmar={(id) =>
              confirmar.mutate(id, {
                onError: (erro) => push(messageFor(erro), 'error'),
              })
            }
          />
        ) : null}
      </div>
    </Layout>
  );
}
