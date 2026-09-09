import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, FieldError, TextArea } from './ui';
import { useCreateComment } from '../hooks/useComments';
import { useToast } from '../contexts/ToastContext';
import { messageFor } from '../lib/errors';
import { createCommentSchema, type CreateCommentInput } from '../types';

/**
 * Campo de comentar. Envio otimista: o texto aparece na lista antes da
 * resposta do servidor e some se a requisicao falhar.
 */
export function CommentForm({ postId }: { postId: string }) {
  const mutation = useCreateComment(postId);
  const { push } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCommentInput>({
    resolver: zodResolver(createCommentSchema),
    defaultValues: { text: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const text = values.text;
    reset({ text: '' });
    try {
      await mutation.mutateAsync({ text });
      push('soltou. ninguém vai saber que foi você.', 'success');
    } catch (error) {
      // O rollback ja aconteceu no onError da mutation; aqui a gente so
      // devolve o texto pra pessoa nao perder o que escreveu.
      reset({ text });
      push(messageFor(error), 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-3.5">
      <label htmlFor="comment-text" className="mb-1.5 block font-body text-[11px] text-[#666]">
        manda o seu, ninguém vai saber:
      </label>
      <TextArea
        id="comment-text"
        rows={2}
        placeholder="solta o babado aqui..."
        invalid={Boolean(errors.text)}
        aria-describedby={errors.text ? 'comment-text-error' : undefined}
        {...register('text')}
      />
      <FieldError id="comment-text-error">{errors.text?.message}</FieldError>

      <div className="mt-[9px] flex items-center justify-between gap-3">
        <p className="font-body text-[10px] leading-[1.3] text-muted">sem nome, sem foto, sem @</p>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'soltando…' : 'soltar'}
        </Button>
      </div>
    </form>
  );
}
