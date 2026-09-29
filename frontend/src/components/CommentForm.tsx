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

  const onSubmit = handleSubmit(
    // Função de Sucesso (Passou no Zod)
    async (values) => {
      console.log("✅ Passou no Zod, vai tentar enviar:", values);
      const text = values.text;
      reset({ text: '' });
      try {
        await mutation.mutateAsync({ text });
        push('soltou. ninguém vai saber que foi você.', 'success');
      } catch (error) {
        reset({ text });
        push(messageFor(error), 'error');
      }
    },
    // Função de Erro (Zod barrou)
    (errors) => {
      console.log("❌ O Zod não deixou o form ser enviado. Erros:", errors);
    }
  );

  return (
    <form onSubmit={onSubmit} className="mt-3.5">
      <label htmlFor="comment-text" className="mb-1.5 block font-body text-[11.5px] text-[#666]">
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
        <p className="font-body text-[10.5px] leading-[1.3] text-muted">sem nome, sem foto, sem @</p>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'soltando…' : 'soltar'}
        </Button>
      </div>
    </form>
  );
}
