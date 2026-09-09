import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { Button, FieldError, Label, TextArea, TextInput } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { useCreatePost } from '../hooks/usePosts';
import { messageFor } from '../lib/errors';
import { createPostSchema, type CreatePostInput } from '../types';

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

/**
 * Reencoda a imagem num canvas antes de enviar.
 *
 * Isso descarta EXIF inteiro — inclusive GPS e horário do disparo, que é
 * a forma mais boba de entregar quem tirou a foto. O que sai daqui é
 * pixel puro.
 */
function stripMetadata(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_IMAGE_PX / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('não deu pra processar a imagem'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('arquivo de imagem inválido'));
    };

    image.src = url;
  });
}

export default function NewPostPage() {
  const navigate = useNavigate();
  const mutation = useCreatePost();
  const { push } = useToast();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
    defaultValues: { title: '', content: '', imageDataUrl: null },
  });

  const content = watch('content') ?? '';

  const takeFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      push('só imagem, por favor.', 'error');
      return;
    }
    try {
      const dataUrl = await stripMetadata(file);
      setPreview(dataUrl);
      setValue('imageDataUrl', dataUrl, { shouldDirty: true });
      push('foto anexada — metadados removidos.', 'success');
    } catch (error) {
      push(messageFor(error), 'error');
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await mutation.mutateAsync(values);
      reset();
      setPreview(null);
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
                <span aria-live="polite">{content.length} / 1200</span>
              </div>
              <FieldError id="content-error">{errors.content?.message}</FieldError>
            </div>

            <div>
              <Label htmlFor="proof">a prova</Label>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void takeFile(event.dataTransfer.files[0]);
                }}
                className={`stripes-drop flex flex-col items-center justify-center gap-1.5 rounded-field border border-dashed px-3 py-6 text-center ${
                  dragging ? 'border-welcome' : 'border-[#c3c3b6]'
                }`}
              >
                {preview ? (
                  <>
                    <img
                      src={preview}
                      alt="Pré-visualização da foto anexada"
                      className="max-h-[160px] rounded-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreview(null);
                        setValue('imageDataUrl', null, { shouldDirty: true });
                        if (fileInput.current) fileInput.current.value = '';
                      }}
                      className="font-body text-[11.5px] text-link underline"
                    >
                      tirar a foto
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-[10.5px] tracking-[.1em] text-[#8b8b7e]">
                      ARRASTE A FOTO AQUI
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="font-body text-[11.5px] text-link underline"
                    >
                      ou escolha do rolo
                    </button>
                    <span className="font-body text-[10px] text-muted">
                      metadados removidos automaticamente
                    </span>
                  </>
                )}
              </div>

              <input
                ref={fileInput}
                id="proof"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void takeFile(event.target.files?.[0])}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 border-t border-hairline pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  reset();
                  setPreview(null);
                }}
              >
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
