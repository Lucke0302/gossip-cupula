import { Card } from './Card';

/**
 * Aviso de página em obras.
 *
 * Vai no topo das telas que ainda rodam em mocks. O recado importante
 * não é "estamos trabalhando nisso" — é que **o conteúdo é inventado**.
 * Uma galeria de fotos falsa sem aviso é pior que uma página vazia:
 * parece que funciona, e aí alguém comenta sobre uma foto que não
 * existe.
 *
 * Some sozinho quando a API ganhar as rotas: é só tirar o componente da
 * página junto com o `source: 'mock'` do service.
 */
export function DevNotice({ oQueFalta }: { oQueFalta: string }) {
  return (
    <Card
      as="aside"
      padding="none"
      className="flex items-start gap-3 border-2 border-dashed border-[#c3c3b6] px-3.5 py-3"
    >
      <span
        aria-hidden="true"
        className="font-hand text-[26px] leading-none text-fofocas"
        style={{ transform: 'rotate(-6deg)' }}
      >
        em obras!
      </span>

      <p className="min-w-0 flex-1 font-body text-[11.5px] leading-[1.45] text-[#555]">
        esta página ainda não está ligada no servidor — <strong>tudo que aparece aqui é
        inventado</strong>, só pra mostrar como vai ficar. {oQueFalta}
      </p>
    </Card>
  );
}
