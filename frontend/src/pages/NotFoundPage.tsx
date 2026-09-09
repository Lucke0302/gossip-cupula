import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  return (
    <Layout bare wordmark="page">
      <div className="mx-auto w-full max-w-[464px]">
        <EmptyState
          glyph="404"
          title="essa página não existe"
          description="ou nunca existiu, ou alguém apagou antes de você chegar. nesta cúpula, as duas coisas acontecem com a mesma frequência."
          hint="se você chegou por um link que alguém te mandou, pergunta pra essa pessoa. com jeitinho."
          action={
            <Link to="/" className="no-underline">
              <Button>voltar pro feed</Button>
            </Link>
          }
        />
      </div>
    </Layout>
  );
}
