import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { GossipfyOverlay } from '../components/GossipfyOverlay';
import { Layout } from '../components/Layout';
import { Button, FieldError, Label, TextArea, TextInput } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { useCreatePost } from '../hooks/usePosts';
import { gossipfy } from '../services/ai.service';
import { messageFor } from '../lib/errors';
import {
  createPostSchema,
  MAX_POST_IMAGES,
  POST_CONTENT_MAX,
  POST_CONTENT_MIN,
  type CreatePostInput,
} from '../types';

const SECTIONS = [
  {
    key: 'welcome',
    label: 'welcome',
    color: 'text-welcome',
    description: 'o que você escrever aqui sai sem assinatura. sempre.',
  },
  {
    key: 'fofocas',
    label: 'fofocas',
    color: 'text-fofocas',
    description: 'ninguém, nem o admin, vê quem escreveu.',
  },
  { key: 'fotos', label: 'fotos', color: 'text-fotos', to: '/fotos' },
  { key: 'eventos', label: 'eventos', color: 'text-eventos', to: '/links' },
  { key: 'links', label: 'links', color: 'text-links', to: '/links' },
];

const MAX_IMAGE_PX = 1600;

/** Teto por arquivo, o mesmo do backend (10 MB). */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Os mesmos tipos que `CreatePostFormRequest` aceita do outro lado. */
const ALLOWED_TYPES: readonly string[] = [
  'image/jpeg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * Reencoda a imagem num canvas antes de enviar.
 *
 * Isso descarta EXIF inteiro — inclusive GPS e horário do disparo, que é
 * a forma mais boba de entregar quem tirou a foto. O que sai daqui é
 * pixel puro, num `File` novo: além do EXIF, o nome original também não
 * viaja (o servidor gera o dele), então o arquivo se chama sempre
 * "babado.jpg" daqui pra frente.
 *
 * O `canvas` reencoda em JPEG, então PNG com transparência e GIF animado
 * chegam do outro lado como imagem estática. É o preço do anonimato.
 */
async function stripMetadata(file: File): Promise<File> {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = url;

    /*
     * `decode()` em vez de `onload`.
     *
     * `onload` avisa que os bytes chegaram, não que a imagem está
     * decodificada e pronta pra ser desenhada. Em alguns navegadores
     * (WebKit, principalmente) desenhar nesse intervalo pinta nada — e
     * "nada" num canvas exportado como JPEG vira PRETO, porque JPEG não
     * tem transparência.
     */
    await image.decode();

    const scale = Math.min(1, MAX_IMAGE_PX / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('não deu pra processar a imagem');

    // Fundo branco antes de desenhar: PNG/GIF com transparência viram
    // JPEG, e sem isso as áreas transparentes sairiam pretas.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    /*
     * Última linha de defesa: se TODO pixel amostrado for preto puro,
     * o desenho falhou. Uma foto de verdade — mesmo tirada no escuro —
     * não dá 0,0,0 em todos os pontos, ainda mais sobre fundo branco.
     * Melhor recusar e avisar do que publicar um retângulo preto.
     */
    if (pareceVazia(context, canvas)) {
      throw new Error('essa imagem não pôde ser processada. tenta de novo ou escolhe outra.');
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82);
    });
    if (!blob) throw new Error('não deu pra processar a imagem');

    return new File([blob], 'babado.jpg', { type: 'image/jpeg' });
  } finally {
    /*
     * Revogar SÓ no fim.
     *
     * Antes isso acontecia logo na entrada do onload, antes do
     * `drawImage` — e revogar a URL pode invalidar o bitmap que o
     * `drawImage` ia usar. Era a causa das fotos pretas: dimensões
     * certas, arquivo minúsculo, imagem 100% preta.
     */
    URL.revokeObjectURL(url);
  }
}

/** Amostra alguns pixels e diz se o canvas ficou todo preto. */
function pareceVazia(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): boolean {
  try {
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    // De 4 em 4 bytes é um pixel; o passo primo evita cair sempre na
    // mesma coluna e ler só uma faixa da imagem.
    for (let i = 0; i < data.length; i += 4 * 1009) {
      if ((data[i] ?? 0) > 0 || (data[i + 1] ?? 0) > 0 || (data[i + 2] ?? 0) > 0) return false;
    }
    return true;
  } catch {
    // Canvas "contaminado" por origem cruzada não deixa ler pixels.
    // Não é o nosso caso (o arquivo é local), mas na dúvida deixa passar.
    return false;
  }
}

/** O que a tela guarda por foto: o arquivo limpo e a prévia na tela. */
type PreparedImage = { file: File; preview: string };

export default function NewPostPage() {
  const navigate = useNavigate();
  const mutation = useCreatePost();
  const { push } = useToast();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [dragging, setDragging] = useState(false);
  const [gossipficando, setGossipficando] = useState(false);
  const [revelando, setRevelando] = useState(false);
  const [textoOriginal, setTextoOriginal] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { title: '', content: '', images: [], gossipifiedPostId: null },
  });

  const content = watch('content') ?? '';
  const gossipificado = watch('gossipifiedPostId');

  /*
   * As fotos saem daqui por três caminhos diferentes (escolher, arrastar
   * e tirar uma). Em vez de cada handler lembrar de mexer no formulário,
   * a lista da tela é a fonte única e o campo `images` apenas a espelha —
   * assim não existe estado em que a prévia mostra uma coisa e o POST
   * manda outra.
   */
  useEffect(() => {
    setValue('images', images.map((image) => image.file), { shouldDirty: true });
  }, [images, setValue]);

  const takeFiles = async (incoming: File[]) => {
    if (incoming.length === 0) return;

    if (images.length + incoming.length > MAX_POST_IMAGES) {
      push(`cabem ${MAX_POST_IMAGES} fotos num post.`, 'error');
      return;
    }

    const prepared: PreparedImage[] = [];

    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        push(`"${file.name}" não é JPEG, PNG, WEBP ou GIF.`, 'error');
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        push(`"${file.name}" passa de 10 MB.`, 'error');
        continue;
      }
      try {
        const clean = await stripMetadata(file);
        prepared.push({ file: clean, preview: URL.createObjectURL(clean) });
      } catch (error) {
        push(messageFor(error), 'error');
      }
    }

    if (prepared.length === 0) return;

    setImages([...images, ...prepared]);
    push(
      prepared.length === 1
        ? 'foto anexada — metadados removidos.'
        : 'fotos anexadas — metadados removidos.',
      'success',
    );
  };

  const removeImage = (index: number) => {
    const target = images[index];
    if (target) URL.revokeObjectURL(target.preview);
    setImages(images.filter((_, position) => position !== index));
  };

  const discardAll = () => {
    for (const image of images) URL.revokeObjectURL(image.preview);
    setImages([]);
    reset();
    if (fileInput.current) fileInput.current.value = '';
  };

  /**
   * Escreve o texto novo letra por letra, como uma coluna sendo redigida.
   *
   * Dura ~1s independente do tamanho: o passo é calculado a partir do
   * comprimento, então um texto longo não vira uma espera dentro da
   * espera. Quem pediu menos movimento recebe o texto de uma vez.
   */
  const revelar = (texto: string) =>
    new Promise<void>((resolve) => {
      const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (semAnimacao) {
        setValue('content', texto, { shouldDirty: true, shouldValidate: true });
        resolve();
        return;
      }

      const QUADROS = 60;
      const passo = Math.max(1, Math.ceil(texto.length / QUADROS));
      let posicao = 0;
      setRevelando(true);

      const timer = window.setInterval(() => {
        posicao = Math.min(posicao + passo, texto.length);
        // Sem validar a cada quadro: o texto parcial é inválido por
        // definição e piscaria mensagem de erro durante a digitação.
        setValue('content', texto.slice(0, posicao), { shouldDirty: true });

        if (posicao >= texto.length) {
          window.clearInterval(timer);
          setValue('content', texto, { shouldDirty: true, shouldValidate: true });
          setRevelando(false);
          resolve();
        }
      }, 16);
    });

  /** Devolve o texto que a pessoa tinha escrito antes da IA. */
  const desfazerGossipficacao = () => {
    if (textoOriginal === null || revelando) return;
    setValue('content', textoOriginal, { shouldDirty: true, shouldValidate: true });
    // Some a FK também: o post volta a ser comum, e um novo clique em
    // gossipficar cria outra transformação em vez de levar 400.
    setValue('gossipifiedPostId', null, { shouldDirty: true });
    setTextoOriginal(null);
    push('voltou pro seu texto. a Gossip Girl que espere.', 'info');
  };

  /**
   * Manda o texto pra IA e troca o que está escrito pelo resultado.
   *
   * Vale só uma vez por texto: o servidor registra cada transformação e
   * recusa a segunda com 400. Por isso o id volta pro formulário — ele é
   * reenviado ao publicar (vira a FK do post) e também é o que trava o
   * botão aqui.
   */
  const gossipficar = async () => {
    const texto = content.trim();
    if (texto.length < POST_CONTENT_MIN || gossipficando || revelando) return;

    setGossipficando(true);
    try {
      const resultado = await gossipfy(texto, gossipificado);

      // Guarda o que a pessoa escreveu antes de sobrescrever: sem isso,
      // quem não gostar do resultado perde o próprio texto.
      setTextoOriginal(resultado.originalContent);
      setValue('gossipifiedPostId', resultado.gossipifiedPostId, { shouldDirty: true });

      // O véu sai ANTES da revelação, senão a máquina de escrever
      // acontece atrás dele e ninguém vê o texto sendo escrito — que é
      // justamente o pagamento dos 10 segundos de espera.
      setGossipficando(false);
      await revelar(resultado.transformedContent);

      // Avisos não bloqueiam: a redação acontece mesmo se a etapa de
      // análise falhar. Mas a pessoa merece saber que saiu capenga.
      if (resultado.warnings.length > 0) {
        push(resultado.warnings[0] ?? 'a IA reclamou de alguma coisa.', 'info');
      } else {
        push('gossipficado. agora sim tem veneno.', 'success');
      }
    } catch (error) {
      push(messageFor(error), 'error');
    } finally {
      setGossipficando(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await mutation.mutateAsync(values);
      discardAll();
      push('publicado. sem assinatura, como combinado.', 'success');
      navigate(`/post/${created.id}`);
    } catch (error) {
      push(messageFor(error), 'error');
    }
  });

  return (
    <Layout sections={SECTIONS}>
      <div className="flex flex-col gap-3.5">
        <Card padding="none" className="px-3.5 pb-3 pt-3.5">
          <h1 className="pb-1 pt-0.5 text-center font-serif text-[18px] leading-[1.3] text-[#222]">
            solta o babado
          </h1>
          <p className="px-3 pb-3.5 text-center font-body text-[11.5px] leading-[1.4] text-[#777]">
            sem nome, sem foto, sem @. só a história.
          </p>

          <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
            <div>
              <Label htmlFor="title">manchete</Label>
              <TextInput
                id="title"
                placeholder="algo que ninguém vá esquecer amanhã"
                invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'title-error' : undefined}
                {...register('title')}
              />
              <FieldError id="title-error">{errors.title?.message}</FieldError>
            </div>

            <div>
              <Label htmlFor="content">o babado</Label>
              {/* `relative` existe pro véu da IA se encaixar em cima do campo. */}
              <div className="relative">
                <TextArea
                  id="content"
                  rows={6}
                  placeholder="começou na mesa do fundo, quando…"
                  invalid={Boolean(errors.content)}
                  aria-describedby="content-hint content-error"
                  // Durante a revelação o campo é da máquina de escrever:
                  // digitar junto embaralharia o texto que está chegando.
                  readOnly={revelando}
                  {...register('content')}
                />
                <GossipfyOverlay ativo={gossipficando} />
              </div>
              <div className="mt-[5px] flex justify-between gap-3 font-body text-[10.5px] text-muted">
                <span id="content-hint">hora, lugar e um detalhe que só quem estava lá sabe</span>
                {/*
                  Enquanto falta texto, o contador mostra quanto falta — pra
                  pessoa descobrir o limite antes de apanhar do formulário,
                  não depois de enviar.
                */}
                <span aria-live="polite" className="flex-none">
                  {content.trim().length < POST_CONTENT_MIN
                    ? `faltam ${POST_CONTENT_MIN - content.trim().length} caracteres`
                    : `${content.length} / ${POST_CONTENT_MAX}`}
                </span>
              </div>
              <FieldError id="content-error">{errors.content?.message}</FieldError>

              {/*
                A IA reescreve o que está no campo acima. Fica junto do
                textarea de propósito: é uma ação sobre aquele texto, não
                uma etapa separada do formulário.
              */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    gossipficando ||
                    revelando ||
                    Boolean(gossipificado) ||
                    content.trim().length < POST_CONTENT_MIN
                  }
                  aria-describedby="gossipficar-hint"
                  onClick={() => void gossipficar()}
                  className="!bg-eventos !text-white disabled:!bg-[#f2f2ea] disabled:!text-[#999]"
                >
                  {gossipficando ? 'gossipficando…' : 'gossipficar'}
                </Button>

                {/* Só existe depois que há o que desfazer. */}
                {textoOriginal !== null && !gossipficando ? (
                  <button
                    type="button"
                    disabled={revelando}
                    onClick={desfazerGossipficacao}
                    className="font-body text-[11px] text-link underline disabled:opacity-40"
                  >
                    desfazer
                  </button>
                ) : null}

                <span
                  id="gossipficar-hint"
                  aria-live="polite"
                  className="font-body text-[10.5px] leading-[1.35] text-muted"
                >
                  {gossipficando
                    ? 'a fonte está reescrevendo…'
                    : revelando
                      ? 'escrevendo…'
                      : gossipificado
                        ? 'já passou pela Gossip Girl — vale uma vez por texto.'
                        : 'deixa a Gossip Girl reescrever do jeito dela.'}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="proof">
                {images.length > 0 ? `as provas (${images.length}/${MAX_POST_IMAGES})` : 'a prova'}
              </Label>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void takeFiles(Array.from(event.dataTransfer.files));
                }}
                className={`stripes-drop flex flex-col items-center justify-center gap-1.5 rounded-field border border-dashed px-3 py-6 text-center ${
                  dragging ? 'border-welcome' : 'border-[#c3c3b6]'
                }`}
              >
                {images.length > 0 ? (
                  <>
                    <ul className="grid w-full grid-cols-3 gap-2">
                      {images.map((image, index) => (
                        <li key={image.preview} className="relative">
                          <img
                            src={image.preview}
                            alt={`Pré-visualização da foto ${index + 1}`}
                            className="h-20 w-full rounded-sm object-cover"
                          />
                          <button
                            type="button"
                            aria-label={`tirar a foto ${index + 1}`}
                            onClick={() => removeImage(index)}
                            className="absolute right-1 top-1 rounded-[3px] bg-black/60 px-1 font-body text-[10px] leading-[1.5] text-white"
                          >
                            x
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="font-body text-[11.5px] text-link underline"
                    >
                      anexar mais
                    </button>
                    <span className="font-body text-[10px] text-muted">
                      metadados removidos automaticamente
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-[10.5px] tracking-[.1em] text-[#8b8b7e]">
                      ARRASTE AS FOTOS AQUI
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="font-body text-[11.5px] text-link underline"
                    >
                      ou escolha do rolo
                    </button>
                    <span className="font-body text-[10px] text-muted">
                      até {MAX_POST_IMAGES} fotos · metadados removidos automaticamente
                    </span>
                  </>
                )}
              </div>

              <input
                ref={fileInput}
                id="proof"
                type="file"
                accept="image/jpeg, image/png, image/webp, image/gif"
                multiple
                className="sr-only"
                onChange={(event) => {
                  void takeFiles(Array.from(event.target.files ?? []));
                  // Zera pra dar pra escolher o mesmo arquivo de novo depois.
                  event.target.value = '';
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 border-t border-hairline pt-3">
              <Button type="button" variant="secondary" onClick={discardAll}>
                descartar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'publicando…' : 'publicar anônimo'}
              </Button>
            </div>
          </form>
        </Card>

        <p className="text-center font-body text-[11px] leading-[1.4] text-[#b9b9ae]">
          o horário do post é arredondado pra hora cheia — pra ninguém te descobrir pela pressa.
        </p>
      </div>
    </Layout>
  );
}
