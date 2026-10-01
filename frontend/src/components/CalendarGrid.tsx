import { EventStar } from './EventStar';
import { DIAS_DA_SEMANA, inclinacaoDaEstrela, type Celula } from '../lib/calendar';
import type { CalendarEvent } from '../types';

/**
 * A folha do calendário.
 *
 * O fundo é papel pautado: listras horizontais de 24px em azul bem
 * fraco, como caderno. As divisórias são tracejadas de propósito — o
 * desenho inteiro é "rabiscado à mão", então nada aqui usa linha cheia.
 */
export function CalendarGrid({
  celulas,
  eventosPorDia,
  selecionado,
  onSelecionar,
  compacto = false,
}: {
  celulas: Celula[];
  eventosPorDia: Map<string, CalendarEvent>;
  selecionado: string | null;
  onSelecionar: (chave: string) => void;
  compacto?: boolean;
}) {
  const alturaCelula = compacto ? 'h-[52px]' : 'h-[76px]';
  const fonteDia = compacto ? 'text-[20px]' : 'text-[24px]';
  const tamanhoEstrela = compacto ? 26 : 34;

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-[#333]">
        {DIAS_DA_SEMANA.map((dia, indice) => (
          <div
            key={dia}
            className={`text-center font-hand leading-[1.2] ${
              compacto ? 'text-[18px]' : 'text-[22px]'
            } ${indice === 0 || indice === 6 ? 'text-eventos' : 'text-[#555]'}`}
          >
            {compacto ? dia.charAt(0) : dia}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {celulas.map((celula, indice) => {
          const evento = celula.chave ? eventosPorDia.get(celula.chave) : undefined;
          const estaSelecionado = celula.chave !== null && celula.chave === selecionado;

          if (celula.chave === null) {
            return (
              <div
                key={`vazio-${indice}`}
                aria-hidden="true"
                className={`${alturaCelula} border-b border-r border-dashed border-[#d6d6cb] bg-black/[.03]`}
              />
            );
          }

          return (
            <button
              key={celula.chave}
              type="button"
              onClick={() => onSelecionar(celula.chave as string)}
              aria-pressed={estaSelecionado}
              aria-label={
                evento
                  ? `dia ${celula.dia}: ${evento.title}`
                  : `dia ${celula.dia}, nada marcado`
              }
              className={`relative ${alturaCelula} overflow-visible border-b border-r border-dashed border-[#d6d6cb] text-left transition-colors hover:bg-[#fffbe6] ${
                estaSelecionado ? 'bg-[#fff4c4]' : 'bg-transparent'
              }`}
            >
              <span
                className={`absolute font-hand ${fonteDia} leading-none ${
                  compacto ? 'left-1 top-[1px]' : 'left-1.5 top-[2px]'
                } ${celula.fimDeSemana ? 'text-eventos' : 'text-[#333]'}`}
              >
                {celula.dia}
              </span>

              {celula.hoje ? (
                <>
                  {/* Círculo torto à mão, não um border-radius redondo. */}
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-0 border-2 border-fofocas ${
                      compacto ? 'h-[22px] w-[26px]' : 'h-[28px] w-[34px]'
                    }`}
                    style={{
                      borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
                      transform: 'rotate(-8deg)',
                    }}
                  />
                  {!compacto ? (
                    <span className="absolute left-[30px] top-[6px] font-hand text-[15px] leading-none text-fofocas">
                      hoje!
                    </span>
                  ) : null}
                </>
              ) : null}

              {evento ? (
                <>
                  <span
                    className={`absolute ${compacto ? 'bottom-1 right-[3px]' : 'right-1.5 top-[7px]'}`}
                  >
                    <EventStar
                      color={evento.color}
                      size={tamanhoEstrela}
                      rotation={inclinacaoDaEstrela(celula.chave)}
                    />
                  </span>
                  {!compacto ? (
                    <span className="absolute bottom-1 left-[5px] right-1 line-clamp-2 font-body text-[9.5px] leading-[1.15] text-[#333]">
                      {evento.title}
                    </span>
                  ) : null}
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
