import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Layout } from '../components/Layout';
import { Button, Checkbox, FieldError, Label, TextInput } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { USE_MOCKS } from '../lib/env';
import { messageFor } from '../lib/errors';
import { loginSchema, type LoginInput } from '../types';

export default function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { push } = useToast();

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { nickname: '', password: '', remember: false },
  });

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (error) {
      push(messageFor(error), 'error');
    }
  });

  return (
    <Layout bare wordmark="page">
      <div className="mx-auto w-full max-w-[352px]">
        <Card padding="roomy" as="section">
          <h1 className="text-center font-serif text-[17px] leading-[1.3] text-[#222]">entra, vai</h1>
          <p className="mt-[5px] text-center font-body text-[11.5px] leading-[1.4] text-[#777]">
            quem é da cúpula já sabe a senha.
          </p>

          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-[11px]" noValidate>
            <div>
              <Label htmlFor="nickname">apelido</Label>
              <TextInput
                id="nickname"
                autoComplete="username"
                placeholder="o que te chamam nos bastidores"
                invalid={Boolean(errors.nickname)}
                aria-describedby={errors.nickname ? 'nickname-error' : undefined}
                {...register('nickname')}
              />
              <FieldError id="nickname-error">{errors.nickname?.message}</FieldError>
            </div>

            <div>
              <Label htmlFor="password">senha</Label>
              <TextInput
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
              <FieldError id="password-error">{errors.password?.message}</FieldError>
            </div>

            <Checkbox
              id="remember"
              label="lembra de mim (por sua conta e risco)"
              {...register('remember')}
            />

            <Button type="submit" block disabled={isSubmitting}>
              {isSubmitting ? 'entrando…' : 'entrar em silêncio'}
            </Button>

            <p className="text-center font-body text-[11.5px] leading-[1.6] text-[#666]">
              esqueceu a senha? <span className="text-link">a gente finge que não sabe</span>
              <br />
              ainda de fora?{' '}
              <Link to="/cadastro" className="text-link">
                pede convite
              </Link>
            </p>
          </form>

          {USE_MOCKS ? (
            <p className="mt-4 rounded-field border border-dashed border-[#c3c3b6] px-3 py-2 text-center font-body text-[10.5px] leading-[1.5] text-[#8a8a80]">
              modo mock ligado — entra com <strong>gossipgirl</strong> / <strong>xoxo123</strong> ou{' '}
              <strong>convidada</strong> / <strong>cupula123</strong>
            </p>
          ) : null}
        </Card>
      </div>
    </Layout>
  );
}
