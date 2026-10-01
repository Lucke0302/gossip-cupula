import { diaDaChave } from '../lib/calendar';
import type { CalendarEvent } from '../types';

/**
 * "próximos babados" — vive na sidebar, como no canvas.
 *
 * Fica logo abaixo da seção eventos, separado por um tracejado, e os
 * números do dia usam a cor da estrelinha correspondente. É o atalho
 * para pular direto a um dia sem caçar no calendário.
 */
export function UpcomingEvents({
  eventos,
  onEscolher,
}: {
  eventos: CalendarEvent[];
  onEscolher: (data: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-dotted border-wordmark/25 pt-3">
      <h2 className="font-display text-[18px] font-light text-wordmark">próximos babados</h2>

      {eventos.length === 0 ? (
        <p className="font-body text-[11px] leading-[1.35] text-muted-dark">
          mês vazio. ou a cúpula está quieta, ou ninguém teve coragem de marcar nada.
        </p>
      ) : (
        <ul className="flex list-none flex-col gap-2 p-0">
          {eventos.map((evento) => (
            <li key={evento.id}>
              <button
                type="button"
                onClick={() => onEscolher(evento.date)}
                className="flex w-full items-start gap-2 text-left"
              >
                <span
                  className="w-6 flex-none text-right font-hand text-[22px] leading-[0.9]"
                  style={{ color: evento.color }}
                >
                  {diaDaChave(evento.date)}
                </span>
                <span className="font-body text-[11px] leading-[1.3] text-muted-dark">
                  <span className="text-welcome underline">{evento.title}</span>
                  <br />
                  <span className="text-[#8f8f84]">{evento.time}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
