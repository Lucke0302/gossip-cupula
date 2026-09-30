import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { Button, FieldError, Label, TextArea, TextInput } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { useCreatePost } from '../hooks/usePosts';
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
function stripMetadata(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_IMAGE_PX / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('não deu pra processar a imagem'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('não deu pra processar a imagem'));
            return;
          }
          resolve(new File([blob], 'babado.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.82,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('arquivo de imagem inválido'));
    };

    image.src = url;
  });
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { title: '', content: '', images: [] },
  });

  const content = watch('content') ?? '';

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
              <TextArea
                id="content"
                rows={6}
                placeholder="começou na mesa do fundo, quando…"
                invalid={Boolean(errors.content)}
                aria-describedby="content-hint content-error"
                {...register('content')}
              />
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
