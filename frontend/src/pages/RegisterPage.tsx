import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { Button, Checkbox, FieldError, Label, TextInput } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { messageFor } from '../lib/errors';
import { registerSchema, type RegisterInput } from '../types';

export default function RegisterPage() {
  const { register: signUp, status } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nickname: '', inviteCode: '', password: '', oath: undefined },
  });

  if (status === 'authenticated') return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signUp(values);
      push('bem-vinda à cúpula. comporte-se mal.', 'success');
      navigate('/', { replace: true });
    } catch (error) {
      push(messageFor(error), 'error');
    }
  });

  return (
    <Layout bare wordmark="page">
      <div className="mx-auto w-full max-w-[352px]">
        <Card padding="roomy" as="section">
          <h1 className="text-center font-serif text-[19px] leading-[1.3] text-[#222]">
            pede convite
          </h1>
          <p className="mt-[5px] text-center font-body text-[11.5px] leading-[1.4] text-[#777]">
            a gente não pede seu nome. só o babado de entrada.
          </p>

          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-[11px]" noValidate>
            <div>
              <Label htmlFor="nickname">apelido</Label>
              <TextInput
                id="nickname"
                autoComplete="username"
                placeholder="escolhe um e não conta pra ninguém"
                invalid={Boolean(errors.nickname)}
                aria-describedby={errors.nickname ? 'nickname-error' : undefined}
                {...register('nickname')}
              />
              <FieldError id="nickname-error">{errors.nickname?.message}</FieldError>
            </div>

            <div>
              <Label htmlFor="inviteCode">código do convite</Label>
              <TextInput
                id="inviteCode"
                placeholder="XX-0000"
                className="font-mono tracking-[.14em]"
                invalid={Boolean(errors.inviteCode)}
                aria-describedby={errors.inviteCode ? 'invite-error' : undefined}
                {...register('inviteCode')}
              />
              <FieldError id="invite-error">{errors.inviteCode?.message}</FieldError>
            </div>

            <div>
              <Label htmlFor="password">senha</Label>
              <TextInput
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="difícil de adivinhar num jantar"
                invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              <FieldError id="password-error">{errors.password?.message}</FieldError>
            </div>

            <div>
              <Checkbox
                id="oath"
                label="juro que nunca vou assinar nada com meu nome."
                aria-describedby={errors.oath ? 'oath-error' : undefined}
                {...register('oath')}
              />
              <FieldError id="oath-error">{errors.oath?.message}</FieldError>
            </div>

            <Button type="submit" block disabled={isSubmitting}>
              {isSubmitting ? 'pedindo…' : 'quero entrar'}
            </Button>

            <p className="text-center font-body text-[11.5px] leading-[1.6] text-[#666]">
              já é de casa?{' '}
              <Link to="/login" className="text-link">
                entra por aqui
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
