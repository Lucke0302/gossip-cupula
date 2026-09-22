/* ------------------------------------------------------------------ *
 * Dados mockados — suficientes para navegar em TODAS as telas sem
 * backend nenhum.
 *
 * Repare no que NAO existe aqui: nenhum registro de post ou comentario
 * tem autor. Nem escondido, nem comentado, nem "pra usar depois". O mock
 * imita o contrato de verdade, entao ele tambem nao sabe quem escreveu.
 * ------------------------------------------------------------------ */

/** Id opaco de 12 chars — nunca sequencial. */
export function opaqueId(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/** Arredonda para a hora cheia em UTC — o mesmo que o backend deve fazer. */
export function coarse(date: Date): string {
  const copy = new Date(date);
  copy.setUTCMinutes(0, 0, 0);
  return copy.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function hoursAgo(hours: number): string {
  return coarse(new Date(Date.now() - hours * 3_600_000));
}

/**
 * Imagem de placeholder no padrao listrado do design, como data URI.
 * Evita depender de arquivo binario e mantem o visual do canvas.
 */
export function stripeImage(width: number, height: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><pattern id="p" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
<rect width="18" height="18" fill="#e9e9e0"/><rect width="9" height="18" fill="#e0e0d5"/></pattern></defs>
<rect width="100%" height="100%" fill="url(#p)"/>
<text x="50%" y="50%" fill="#8b8b7e" font-family="monospace" font-size="11" letter-spacing="1.6" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\n/g, ''))}`;
}

export type MockPost = {
  id: string;
  title: string;
  excerpt: string;
  body: string[];
  imageUrl: string | null;
  imageAlt: string | null;
  likes: number;
  dislikes: number;
  publishedAt: string;
};

export type MockComment = {
  id: string;
  postId: string;
  text: string;
  publishedAt: string;
};

export const posts: MockPost[] = [
  {
    id: 'aV7kQm2Xr9Lp',
    title: 'A Volta Dela Foi Aviso ou Ameaça?',
    excerpt:
      'Ela desceu do carro usando o mesmo vestido da festa em que jurou nunca mais voltar. Coincidência? Nesta cúpula, ninguém erra o guarda-roupa por acaso.',
    body: [
      'Ela desceu do carro usando o mesmo vestido da festa em que jurou nunca mais voltar. Coincidência? Nesta cúpula, ninguém erra o guarda-roupa por acaso.',
      'A pergunta que interessa não é por que ela voltou — é quem a chamou. E, mais importante, quem vai pagar essa conta antes do fim de semana. Já tenho um palpite. Vocês têm treze.',
    ],
    imageUrl: stripeImage(840, 500, 'FOTO DO POST'),
    imageAlt: 'Placeholder listrado no lugar da foto anexada ao post',
    likes: 14,
    dislikes: 3,
    publishedAt: hoursAgo(3),
  },
  {
    id: 'Zt4nBw8Yc1Hd',
    title: 'Duas Taças, Três Histórias',
    excerpt:
      'Alguém pediu a mesa do fundo. Alguém pagou em dinheiro. E alguém saiu pela porta da cozinha. Três alguéns, um bilhete só.',
    body: [
      'Alguém pediu a mesa do fundo. Alguém pagou em dinheiro. E alguém saiu pela porta da cozinha. Três alguéns, um bilhete só.',
      'Já sabemos de dois. Falta você contar o terceiro — e a gente sabe que você sabe, porque estava na mesa ao lado fingindo ler o cardápio.',
    ],
    imageUrl: stripeImage(840, 392, 'FOTO DO POST'),
    imageAlt: 'Placeholder listrado no lugar da foto anexada ao post',
    likes: 6,
    dislikes: 1,
    publishedAt: hoursAgo(28),
  },
  {
    id: 'Rk9fHs3Vn6Qe',
    title: 'O Convite Que Nunca Chegou (De Novo)',
    excerpt:
      'A lista tinha quarenta nomes. Trinta e nove receberam. O quadragésimo descobriu pelo story de outra pessoa, o que é bem pior.',
    body: [
      'A lista tinha quarenta nomes. Trinta e nove receberam. O quadragésimo descobriu pelo story de outra pessoa, o que é bem pior do que não ser convidada.',
      'Dizem que foi erro do correio. O correio, coitado, leva a culpa de metade dos rompimentos dessa cúpula.',
    ],
    imageUrl: null,
    imageAlt: null,
    likes: 3,
    dislikes: 0,
    publishedAt: hoursAgo(51),
  },
  {
    id: 'Mp2cLd7Tj5Ws',
    title: 'Alguém Devolveu a Chave. Ninguém Pediu.',
    excerpt:
      'Chave devolvida sem bilhete é a coisa mais barulhenta que existe. E essa foi entregue na portaria, com testemunha.',
    body: [
      'Chave devolvida sem bilhete é a coisa mais barulhenta que existe. E essa foi entregue na portaria, com testemunha, o que sugere que o silêncio era pra ser público.',
      'Duas pessoas sabem de qual porta é. Uma delas está lendo isso agora e considerando fechar o notebook.',
    ],
    imageUrl: stripeImage(840, 440, 'FOTO DO POST'),
    imageAlt: 'Placeholder listrado no lugar da foto anexada ao post',
    likes: 9,
    dislikes: 2,
    publishedAt: hoursAgo(74),
  },
  {
    id: 'Ng6yUb1Kf8Az',
    title: 'O Jantar Terminou em Três Táxis Diferentes',
    excerpt:
      'Chegaram juntos. Saíram em três carros, em três direções, com três desculpas que não combinam entre si.',
    body: [
      'Chegaram juntos. Saíram em três carros, em três direções, com três desculpas que não combinam entre si — e a gente conferiu.',
      'A sobremesa nem chegou à mesa. O que quer que tenha sido dito entre o prato principal e a conta, foi caro.',
    ],
    imageUrl: stripeImage(840, 380, 'FOTO DO POST'),
    imageAlt: 'Placeholder listrado no lugar da foto anexada ao post',
    likes: 21,
    dislikes: 5,
    publishedAt: hoursAgo(99),
  },
  {
    id: 'Cw5jEr4Pm7Bu',
    title: 'Todo Mundo Viu. Ninguém Comenta. Até Agora.',
    excerpt:
      'Existe um tipo de silêncio coletivo que é praticamente uma confissão assinada. Foi esse o silêncio de sábado.',
    body: [
      'Existe um tipo de silêncio coletivo que é praticamente uma confissão assinada. Foi esse o silêncio de sábado, das 23h em diante.',
      'Não vou ser eu a estragar. Vou ser eu a abrir os comentários e esperar sentada.',
    ],
    imageUrl: null,
    imageAlt: null,
    likes: 4,
    dislikes: 1,
    publishedAt: hoursAgo(126),
  },
  {
    id: 'Ds8vTn0Gq2Xy',
    title: 'A Reserva Estava em Outro Nome',
    excerpt:
      'E o outro nome não é de ninguém que a gente conhece. O que significa que é de alguém que a gente conhece muito bem.',
    body: [
      'E o outro nome não é de ninguém que a gente conhece. O que, nesta cúpula, significa exatamente o contrário: é de alguém que a gente conhece muito bem.',
      'Duas mesas. Mesma noite. Restaurantes a seis quarteirões um do outro. Alguém dirigiu rápido.',
    ],
    imageUrl: stripeImage(840, 420, 'FOTO DO POST'),
    imageAlt: 'Placeholder listrado no lugar da foto anexada ao post',
    likes: 11,
    dislikes: 2,
    publishedAt: hoursAgo(150),
  },
];

export const comments: MockComment[] = [
  {
    id: 'q1WeRt5YuIo9',
    postId: 'aV7kQm2Xr9Lp',
    text: 'o vestido é da irmã. isso muda tudo e vocês sabem.',
    publishedAt: hoursAgo(2),
  },
  {
    id: 'p0OiUy4TrEw8',
    postId: 'aV7kQm2Xr9Lp',
    text: 'eu estava na porta. não desceu sozinha. só isso.',
    publishedAt: hoursAgo(2),
  },
  {
    id: 'l9KjHg3FdSa7',
    postId: 'aV7kQm2Xr9Lp',
    text: 'alguém aqui tem foto? porque texto todo mundo tem.',
    publishedAt: hoursAgo(1),
  },
  {
    id: 'm8NbVc2XzAq6',
    postId: 'Zt4nBw8Yc1Hd',
    text: 'a mesa do fundo é sempre a mesma pessoa que pede. sempre.',
    publishedAt: hoursAgo(20),
  },
  {
    id: 'n7BvCx1ZaQw5',
    postId: 'Zt4nBw8Yc1Hd',
    text: 'pagar em dinheiro em 2026 é praticamente gritar por atenção',
    publishedAt: hoursAgo(18),
  },
  {
    id: 'b6VcXz0AqSw4',
    postId: 'Rk9fHs3Vn6Qe',
    text: 'o correio nessa cidade trabalha demais pra levar tanta culpa',
    publishedAt: hoursAgo(40),
  },
];

export const photos = [
  {
    id: 'F1aBcDeFgHi2',
    url: stripeImage(600, 600, 'GALERIA 01'),
    alt: 'Placeholder listrado de foto da galeria da semana',
    caption: 'a entrada, 23h. reparem no reflexo do vidro.',
    width: 600,
    height: 600,
    publishedAt: hoursAgo(4),
  },
  {
    id: 'F2bCdEfGhIj3',
    url: stripeImage(600, 800, 'GALERIA 02'),
    alt: 'Placeholder listrado de foto da galeria da semana',
    caption: 'duas taças, uma delas cheia até o fim da noite.',
    width: 600,
    height: 800,
    publishedAt: hoursAgo(27),
  },
  {
    id: 'F3cDeFgHiJk4',
    url: stripeImage(600, 460, 'GALERIA 03'),
    alt: 'Placeholder listrado de foto da galeria da semana',
    caption: 'o casaco que ficou na cadeira até fecharem.',
    width: 600,
    height: 460,
    publishedAt: hoursAgo(50),
  },
  {
    id: 'F4dEfGhIjKl5',
    url: stripeImage(600, 720, 'GALERIA 04'),
    alt: 'Placeholder listrado de foto da galeria da semana',
    caption: 'três táxis. contamos.',
    width: 600,
    height: 720,
    publishedAt: hoursAgo(73),
  },
  {
    id: 'F5eFgHiJkLm6',
    url: stripeImage(600, 540, 'GALERIA 05'),
    alt: 'Placeholder listrado de foto da galeria da semana',
    caption: 'a portaria, com testemunha e tudo.',
    width: 600,
    height: 540,
    publishedAt: hoursAgo(98),
  },
  {
    id: 'F6fGhIjKlMn7',
    url: stripeImage(600, 620, 'GALERIA 06'),
    alt: 'Placeholder listrado de foto da galeria da semana',
    caption: 'o cardápio que ninguém leu de verdade.',
    width: 600,
    height: 620,
    publishedAt: hoursAgo(125),
  },
];

export const links = [
  {
    id: 'Lk1AbCdEfGh2',
    label: 'as regras da cúpula',
    url: 'https://example.com/regras',
    note: 'leia antes de reclamar que apagamos seu post.',
    section: 'welcome' as const,
  },
  {
    id: 'Lk2BcDeFgHi3',
    label: 'como a gente protege seu anonimato',
    url: 'https://example.com/anonimato',
    note: 'o que a gente guarda, o que a gente joga fora na hora.',
    section: 'welcome' as const,
  },
  {
    id: 'Lk3CdEfGhIj4',
    label: 'arquivo morto — 2025',
    url: 'https://example.com/arquivo-2025',
    note: 'os babados que sobreviveram ao ano passado.',
    section: 'fofocas' as const,
  },
  {
    id: 'Lk4DeFgHiJk5',
    label: 'galeria da semana passada',
    url: 'https://example.com/galeria-anterior',
    note: 'quem apareceu, com quem, vestindo o quê.',
    section: 'fotos' as const,
  },
  {
    id: 'Lk5EfGhIjKl6',
    label: 'calendário da temporada',
    url: 'https://example.com/eventos',
    note: 'seu convite provavelmente sumiu no correio.',
    section: 'eventos' as const,
  },
  {
    id: 'Lk6FgHiJkLm7',
    label: 'pedir um convite',
    url: 'https://example.com/convite',
    note: 'a gente não pede seu nome. só o babado de entrada.',
    section: 'links' as const,
  },
];

/** Contas de faz-de-conta pra testar o login sem backend. */
export const accounts = [
  { nickname: 'gossipgirl', email: 'gossip@cupula.test', password: 'xoxo123', role: 'admin' as const },
  { nickname: 'convidada', email: 'convidada@cupula.test', password: 'cupula123', role: 'user' as const },
];
