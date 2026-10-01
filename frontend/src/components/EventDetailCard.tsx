import { useState } from 'react';
import { Card } from './Card';
import { EventStar } from './EventStar';
import { Button, Checkbox } from './ui';
import {
  DIAS_DA_SEMANA,
  diaDaChave,
  diaDaSemanaDaChave,
  formatarHora,
} from '../lib/calendar';
import { EVENT_COLORS, HORARIOS, type CalendarEvent, type EventColor } from '../types';

/** Mesmo visual dos campos do resto do site (ui.tsx), em input solto. */
const CAMPO =
  'w-full rounded-field border border-field-border bg-field px-[10px] py-2 font-body text-[12.5px] leading-[1.35] text-body shadow-sunken outline-none placeholder:text-[#9d9d92] focus:border-welcome focus:shadow-focusring';

/**
 * O cartão abaixo do calendário: ou mostra o que está marcado no dia
 * escolhido, ou oferece fixar uma estrelinha nele.
 */
export function EventDetailCard({
  chaveDoDiaSelecionado,
  evento,
  nickname,
  ocupado,
  onFixar,
  onDesfixar,
  onConfirmar,
}: {
  chaveDoDiaSelecionado: string;
  evento: CalendarEvent | undefined;
  /** Apelido de quem está logado, para a opção de assinar. */
  nickname: string | null;
  ocupado: boolean;
  onFixar: (dados: {
    titulo: string;
    hora: string | null;
    local: string;
    cor: EventColor;
    assinar: boolean;
  }) => void;
  onDesfixar: (id: string) => void;
  onConfirmar: (id: string) => void;
}) {
  const [rascunho, setRascunho] = useState('');
  const [hora, setHora] = useState<string | null>(null);
  const [local, setLocal] = useState('');
  const [assinar, setAssinar] = useState(false);
  const [cor, setCor] = useState<EventColor>(EVENT_COLORS[0]);

  const dia = diaDaChave(chaveDoDiaSelecionado);
  const semana = DIAS_DA_SEMANA[diaDaSemanaDaChave(chaveDoDiaSelecionado)] ?? '';

  return (
    <Card padding="none" className="flex items-start gap-4 px-4 py-3.5" as="section">
      <div className="w-16 flex-none text-center">
        <div className="font-hand text-[56px] leading-[0.85] text-[#222]">{dia}</div>
        <div className="mt-[3px] font-body text-[10px] uppercase leading-none tracking-[.08em] text-muted">
          {semana}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {evento ? (
          <>
            <h3 className="font-serif text-[16px] leading-[1.25] text-[#222]">{evento.title}</h3>
            <p className="mt-[3px] font-body text-[11px] leading-[1.4] text-[#777]">
              {formatarHora(evento.time)} · {evento.place}
            </p>
            <p className="mt-[7px] font-body text-post text-body">{evento.description}</p>

            {/*
              Só aparece quando a pessoa escolheu assinar. A ausência da
              linha já significa anônimo — o padrão da casa não precisa
              de legenda.
            */}
            {evento.authorName ? (
              <p className="mt-2 font-body text-[11px] text-[#666]">
                fixado por <span className="text-eventos">{evento.authorName}</span>
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-body text-[11px] text-[#666]">
                {evento.goingCount} confirmaram (anônimos, claro)
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => onDesfixar(evento.id)}
                  className="font-body text-[11px] text-link underline disabled:opacity-50"
                >
                  desfixar
                </button>
                <Button
                  disabled={ocupado}
                  onClick={() => onConfirmar(evento.id)}
                  className={evento.isGoing ? '!bg-eventos' : '!bg-eventos/80'}
                >
                  {evento.isGoing ? 'tô dentro ✓' : 'vou de penetra'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-serif text-[16px] leading-[1.25] text-[#222]">
              nada marcado. ainda.
            </h3>
            <p className="mt-[3px] font-body text-[11px] leading-[1.4] text-[#777]">
              sabe de alguma coisa nesse dia? fixa uma estrelinha.
            </p>

            <label htmlFor="novo-evento" className="sr-only">
              o que vai rolar nesse dia
            </label>
            <input
              id="novo-evento"
              value={rascunho}
              onChange={(evt) => setRascunho(evt.target.value)}
              placeholder="o que vai rolar? (sem nomes)"
              maxLength={120}
              className={CAMPO}
            />

            {/* É uma agenda: hora e lugar entram na hora de marcar. */}
            <div className="mt-2 flex gap-2">
              <div className="w-[40%] flex-none">
                <label htmlFor="novo-evento-hora" className="sr-only">
                  horário
                </label>
                {/*
                  Lista fechada em vez de campo livre: o valor sai daqui
                  sempre em HH:mm, que entra direto num TimeOnly do lado
                  do servidor. Sem horário escolhido = null, e quem
                  escreve "a confirmar" é a tela.
                */}
                <select
                  id="novo-evento-hora"
                  value={hora ?? ''}
                  onChange={(evt) => setHora(evt.target.value || null)}
                  className={CAMPO}
                >
                  <option value="">a confirmar</option>
                  {HORARIOS.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {formatarHora(opcao)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="novo-evento-local" className="sr-only">
                  onde vai ser
                </label>
                <input
                  id="novo-evento-local"
                  value={local}
                  onChange={(evt) => setLocal(evt.target.value)}
                  placeholder="onde? (sem endereço exato)"
                  maxLength={120}
                  className={CAMPO}
                />
              </div>
            </div>

            {/*
              A exceção do site: aqui dá pra assinar. Evento é logística,
              não fofoca — quem organiza o jantar costuma querer ser
              encontrável. Padrão continua anônimo.
            */}
            {nickname ? (
              <div className="mt-2.5">
                <Checkbox
                  id="assinar-evento"
                  checked={assinar}
                  onChange={(evt) => setAssinar(evt.target.checked)}
                  label={
                    <>
                      assinar como <span className="text-eventos">{nickname}</span> — senão fica
                      anônimo
                    </>
                  }
                />
              </div>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-[7px]">
                <span className="font-body text-[11px] text-[#666]">cor:</span>
                {EVENT_COLORS.map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setCor(opcao)}
                    aria-label={`cor ${opcao}`}
                    aria-pressed={cor === opcao}
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ boxShadow: cor === opcao ? '0 0 0 2px #333' : 'none' }}
                  >
                    <EventStar color={opcao} size={16} />
                  </button>
                ))}
              </div>

              <Button
                disabled={ocupado || rascunho.trim().length < 3}
                onClick={() => {
                  onFixar({ titulo: rascunho, hora, local, cor, assinar });
                  setRascunho('');
                  setHora(null);
                  setLocal('');
                  setAssinar(false);
                }}
              >
                {ocupado ? 'fixando…' : 'fixar estrelinha'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
