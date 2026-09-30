/**
 * Fotos de um post.
 *
 * O servidor só manda URLs — não existe legenda nem descrição por
 * imagem, então o `alt` é o mesmo para todas. Uma foto ocupa a largura
 * inteira; duas ou mais viram um grid de duas colunas.
 *
 * `max-h-96` com `object-cover` é o que segura o layout: foto de celular
 * (vertical e enorme) corta em vez de esticar o cartão do feed.
 */
export function PostImages({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;

  return (
    <div className={urls.length > 1 ? 'grid grid-cols-2 gap-2 px-[3px]' : 'px-[3px]'}>
      {urls.map((url, index) => (
        <img
          key={index}
          src={url}
          alt="Imagem do post"
          loading="lazy"
          decoding="async"
          className="block max-h-96 w-full rounded-md object-cover"
        />
      ))}
    </div>
  );
}
