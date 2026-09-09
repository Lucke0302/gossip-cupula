/** Erro vindo da API com status HTTP conhecido. */
export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * A resposta passou pelo HTTP mas nao passou pelo schema Zod.
 * Na pratica: o contrato do backend mudou — ou vazou um campo que nao
 * deveria existir (autor!). Isso e' bug, nao "dado estranho".
 */
export class ContractError extends Error {
  readonly path: string;
  readonly issues: unknown;

  constructor(path: string, issues: unknown) {
    super(`resposta de ${path} não bate com o contrato esperado`);
    this.name = 'ContractError';
    this.path = path;
    this.issues = issues;
  }
}

/** Sessao caiu de vez: refresh falhou. */
export class SessionExpiredError extends Error {
  constructor() {
    super('sessão expirada');
    this.name = 'SessionExpiredError';
  }
}

export function messageFor(error: unknown): string {
  if (error instanceof ContractError) {
    return 'a fonte respondeu errado. avisa quem cuida do servidor.';
  }
  if (error instanceof SessionExpiredError) {
    return 'sua sessão caiu. entra de novo.';
  }
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.name === 'AbortError') {
    return 'requisição cancelada';
  }
  if (error instanceof TypeError) {
    return 'sem conexão com a cúpula. tenta de novo.';
  }
  return 'alguma coisa deu errado. tenta de novo.';
}
