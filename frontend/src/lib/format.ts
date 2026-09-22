const DIAS = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
] as const;

/**
 * Formata um carimbo grosseiro (hora cheia) do jeito do blog.
 *
 * Recorta de proposito: nada de "23h47", nada de segundos. Se dois posts
 * sairam com 4 minutos de diferenca, aqui os dois viram "23h" — quem le
 * nao consegue reconstruir a ordem exata nem cruzar com quem saiu da sala.
 */
export function fuzzyTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const hour = `${String(date.getHours()).padStart(2, '0')}h`;
  const diffDays = Math.floor(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000,
  );

  if (diffDays <= 0) return `hoje · ${hour}`;
  if (diffDays === 1) return `ontem · ${hour}`;
  if (diffDays < 7) return `${DIAS[date.getDay()] ?? ''} · ${hour}`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semana(s)`;
  return 'já faz um tempo';
}

/** Versao acessivel do mesmo carimbo, pro atributo title. */
export function fuzzyTimeLong(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const dia = DIAS[date.getDay()] ?? '';
  return `${dia}, por volta das ${String(date.getHours()).padStart(2, '0')}h`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
