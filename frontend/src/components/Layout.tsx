import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AvatarNav } from './AvatarNav';
import { Sidebar, DEFAULT_SECTIONS } from './Sidebar';
import { Wordmark } from './Wordmark';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  children: ReactNode;
  /** Descrições laterais mudam de tela pra tela, como no design. */
  sections?: typeof DEFAULT_SECTIONS;
  wordmark?: 'hero' | 'page';
  /** Telas de login/cadastro não têm menu nem avatares. */
  bare?: boolean;
};

/**
 * Layout de três colunas do design: menu de texto | conteúdo | avatares.
 * No mobile vira uma coluna só, com os avatares em linha rolável no topo
 * e o menu de texto no rodapé — igual às telas 390px do canvas.
 */
export function Layout({ children, sections = DEFAULT_SECTIONS, wordmark = 'page', bare = false }: Props) {
  const { isAuthenticated, nickname, logout } = useAuth();

  return (
    <div className="bokeh min-h-screen pb-16">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:font-body focus:text-[13px] focus:text-body"
      >
        pular para o conteúdo
      </a>

      <header className="pt-5 sm:pt-7">
        <Wordmark size={wordmark} />
      </header>

      {bare ? (
        <main id="conteudo" className="mx-auto w-full max-w-[720px] px-4 pt-7">
          {children}
        </main>
      ) : (
        <>
          <div className="lg:hidden">
            <AvatarNav orientation="horizontal" />
          </div>

          <div className="mx-auto flex w-full max-w-[1024px] items-start justify-center gap-10 px-4 pt-4 sm:pt-6">
            <Sidebar sections={sections} className="hidden w-[200px] flex-none pt-1 lg:flex" />

            <main id="conteudo" className="w-full max-w-[464px] flex-none">
              {children}
            </main>

            <div className="hidden flex-none lg:block">
              <AvatarNav />
            </div>
          </div>

          <div className="mx-auto mt-8 w-full max-w-[464px] border-t border-wordmark/10 px-4 pt-7 lg:hidden">
            <Sidebar sections={sections} />
          </div>
        </>
      )}

      <footer className="mx-auto mt-10 w-full max-w-[464px] px-4 text-center font-body text-[11px] leading-[1.6] text-[#8a8a80]">
        {isAuthenticated ? (
          <p>
            você entrou como <span className="text-muted-dim">{nickname}</span> — e isso não aparece
            em lugar nenhum além daqui.{' '}
            <button
              type="button"
              onClick={() => void logout()}
              className="text-welcome underline underline-offset-2"
            >
              sair
            </button>
          </p>
        ) : (
          <p>
            <Link to="/login" className="text-welcome">
              entrar
            </Link>{' '}
            para ler o babado.
          </p>
        )}
        <p className="mt-2 tracking-[.04em]">xoxo, cúpula</p>
      </footer>
    </div>
  );
}
