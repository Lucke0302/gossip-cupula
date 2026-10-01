/* ------------------------------------------------------------------ *
 * Contas de calendário.
 *
 * Tudo aqui trabalha com data LOCAL, não UTC: o calendário é sobre o dia
 * que a pessoa vive, não sobre o fuso do servidor. Por isso as datas
 * circulam como "YYYY-MM-DD" montado à mão — `toISOString()` converteria
 * para UTC e, à noite no Brasil, jogaria o evento para o dia seguinte.
 * ------------------------------------------------------------------ */

export const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

export const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM" do mês de uma data. */
export function chaveDoMes(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}`;
}

/** "YYYY-MM-DD" de um dia, em horário local. */
export function chaveDoDia(ano: number, mes: number, dia: number): string {
  return `${ano}-${doisDigitos(mes + 1)}-${doisDigitos(dia)}`;
}

export function nomeDoMes(data: Date): string {
  return MESES[data.getMonth()] ?? '';
}

export function mesVizinho(data: Date, passo: number): Date {
  return new Date(data.getFullYear(), data.getMonth() + passo, 1);
}

export type Celula = {
  /** Dia do mês, ou null quando a célula é só preenchimento da grade. */
  dia: number | null;
  /** "YYYY-MM-DD", só para células válidas. */
  chave: string | null;
  fimDeSemana: boolean;
  hoje: boolean;
};

/**
 * Monta a grade do mês: sempre semanas inteiras, começando no domingo.
 *
 * O design desenha 35 células (5 semanas), que é o caso comum — mas um
 * mês de 31 dias que começa numa sexta precisa de 42. A grade cresce
 * quando precisa em vez de esconder dias.
 */
export function montarGrade(mesCorrente: Date, hoje: Date = new Date()): Celula[] {
  const ano = mesCorrente.getFullYear();
  const mes = mesCorrente.getMonth();

  const primeiroDiaDaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const total = Math.ceil((primeiroDiaDaSemana + diasNoMes) / 7) * 7;
  const celulas: Celula[] = [];

  for (let i = 0; i < total; i += 1) {
    const dia = i - primeiroDiaDaSemana + 1;
    const valido = dia >= 1 && dia <= diasNoMes;
    celulas.push({
      dia: valido ? dia : null,
      chave: valido ? chaveDoDia(ano, mes, dia) : null,
      fimDeSemana: i % 7 === 0 || i % 7 === 6,
      hoje:
        valido &&
        dia === hoje.getDate() &&
        mes === hoje.getMonth() &&
        ano === hoje.getFullYear(),
    });
  }

  return celulas;
}

/**
 * Inclinação da estrelinha, derivada do dia.
 *
 * É a fórmula do canvas: parece rabiscado à mão, mas é determinística —
 * a mesma estrela não fica dançando a cada render.
 */
export function inclinacaoDaEstrela(chave: string): number {
  const dia = Number(chave.slice(-2));
  return ((dia * 37) % 34) - 17;
}

/** Dia do mês a partir de "YYYY-MM-DD", sem passar por Date. */
export function diaDaChave(chave: string): number {
  return Number(chave.slice(-2));
}

/** Índice do dia da semana de "YYYY-MM-DD", em horário local. */
export function diaDaSemanaDaChave(chave: string): number {
  const [ano, mes, dia] = chave.split('-').map(Number);
  return new Date(ano ?? 0, (mes ?? 1) - 1, dia ?? 1).getDay();
}

/**
 * "22:30" → "22h30", "22:00" → "22h", null → "horário a confirmar".
 *
 * O dado trafega em HH:mm (previsível para o servidor); o que a pessoa
 * lê é o formato brasileiro, que é como o design escreve.
 */
export function formatarHora(hora: string | null): string {
  if (!hora) return 'horário a confirmar';
  const [h, m] = hora.split(':');
  return m === '00' ? `${h}h` : `${h}h${m}`;
}
