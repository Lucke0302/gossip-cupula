import type { VoteValue } from '../types';

/* ------------------------------------------------------------------ *
 * Memoria do proprio voto.
 *
 * A API guarda quem votou (chave PostId + UserId), mas nao devolve isso:
 * a resposta e' so' `{ postId, likes, dislikes }`, e o post tambem nao
 * traz nada do tipo "myVote". Ou seja, depois de um F5 o front nao teria
 * como saber se voce ja tinha votado — e o botao apareceria "apagado"
 * mesmo com o voto contabilizado.
 *
 * Entao esse estado fica em localStorage: e' conveniencia visual de um
 * navegador so'. Nao e' verdade absoluta (outro dispositivo nao sabe, e
 * limpar o site esquece), e nao vale como autorizacao — quem decide se o
 * voto conta e' o servidor. Se um dia a API expuser o voto do usuario,
 * este arquivo some.
 * ------------------------------------------------------------------ */

const CHAVE = 'gc:votos';

type Mapa = Record<string, VoteValue>;

function ler(): Mapa {
  try {
    const cru = localStorage.getItem(CHAVE);
    return cru ? (JSON.parse(cru) as Mapa) : {};
  } catch {
    // Janela anonima, storage bloqueado, JSON corrompido: segue sem memoria.
    return {};
  }
}

function escrever(mapa: Mapa): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(mapa));
  } catch {
    /* sem espaco ou sem permissao: o voto ainda conta no servidor */
  }
}

export function meuVoto(postId: string): VoteValue | null {
  return ler()[postId] ?? null;
}

/**
 * Guarda o voto — ou esquece, quando a pessoa clica de novo no mesmo
 * botao. Espelha a regra do servidor: mesmo tipo duas vezes remove.
 */
export function lembrarVoto(postId: string, voto: VoteValue | null): void {
  const mapa = ler();
  if (voto === null) delete mapa[postId];
  else mapa[postId] = voto;
  escrever(mapa);
}
