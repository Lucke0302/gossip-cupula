import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEvent,
  deleteEvent,
  listEvents,
  toggleGoing,
  updateEvent,
} from '../services/events.service';
import type {
  CalendarEvent,
  CreateEventInput,
  GoingResult,
  Page,
  UpdateEventInput,
} from '../types';

const eventsKey = (month: string) => ['events', month] as const;

export function useEvents(month: string, enabled: boolean) {
  return useQuery<Page<CalendarEvent>, Error>({
    queryKey: eventsKey(month),
    queryFn: ({ signal }) => listEvents(month, signal),
    enabled,
  });
}

export function useCreateEvent(month: string) {
  const client = useQueryClient();

  return useMutation<CalendarEvent, Error, CreateEventInput>({
    mutationFn: createEvent,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: eventsKey(month) });
    },
  });
}

/**
 * Editar nome, data e local.
 *
 * Sem otimismo: a edicao so' entra se o servidor permitir (canEdit), e um
 * 403 precisa chegar pra tela — da' o invalidate para recarregar o estado
 * real em caso de corrida.
 */
export function useUpdateEvent(month: string) {
  const client = useQueryClient();

  return useMutation<CalendarEvent, Error, { id: string; input: UpdateEventInput }>({
    mutationFn: ({ id, input }) => updateEvent(id, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: eventsKey(month) });
    },
  });
}

/** Desfixar apaga o evento — sem otimismo, porque é irreversível. */
export function useDeleteEvent(month: string) {
  const client = useQueryClient();

  return useMutation<undefined, Error, string>({
    mutationFn: deleteEvent,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: eventsKey(month) });
    },
  });
}

/**
 * Confirmar presença.
 *
 * Com otimismo: é um toggle barato e sem consequência, e o número tem
 * que reagir ao clique. Se falhar, o cache volta ao que era.
 */
export function useToggleGoing(month: string) {
  const client = useQueryClient();
  const chave = eventsKey(month);

  return useMutation<GoingResult, Error, string, { anterior?: Page<CalendarEvent> }>({
    mutationFn: toggleGoing,

    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: chave });
      const anterior = client.getQueryData<Page<CalendarEvent>>(chave);

      client.setQueryData<Page<CalendarEvent>>(chave, (pagina) =>
        pagina
          ? {
              ...pagina,
              items: pagina.items.map((evento) =>
                evento.id === id
                  ? {
                      ...evento,
                      isGoing: !evento.isGoing,
                      goingCount: Math.max(
                        evento.goingCount + (evento.isGoing ? -1 : 1),
                        0,
                      ),
                    }
                  : evento,
              ),
            }
          : pagina,
      );

      return { anterior };
    },

    onError: (_erro, _id, contexto) => {
      if (contexto?.anterior) client.setQueryData(chave, contexto.anterior);
    },

    onSuccess: (resultado) => {
      client.setQueryData<Page<CalendarEvent>>(chave, (pagina) =>
        pagina
          ? {
              ...pagina,
              items: pagina.items.map((evento) =>
                evento.id === resultado.eventId
                  ? {
                      ...evento,
                      goingCount: resultado.goingCount,
                      isGoing: resultado.isGoing,
                    }
                  : evento,
              ),
            }
          : pagina,
      );
    },
  });
}
