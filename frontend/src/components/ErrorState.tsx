import { Card } from './Card';
import { Button } from './ui';
import { messageFor } from '../lib/errors';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Card padding="none" className="px-6 py-7 text-center" as="section">
      <p className="font-serif text-[19px] text-[#222]">a fonte não respondeu</p>
      <p role="alert" className="mt-[9px] font-body text-post text-[#555]">
        {messageFor(error)}
      </p>
      {onRetry ? (
        <div className="mt-4">
          <Button onClick={onRetry}>tentar de novo</Button>
        </div>
      ) : null}
    </Card>
  );
}
