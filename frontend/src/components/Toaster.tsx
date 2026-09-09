import { useToast, type ToastTone } from '../contexts/ToastContext';

const TONE: Record<ToastTone, string> = {
  info: 'border-l-welcome',
  success: 'border-l-links',
  error: 'border-l-fofocas',
};

/**
 * Toasts. A regiao e' aria-live="polite", entao leitor de tela anuncia
 * sem interromper o que a pessoa esta fazendo.
 */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-full max-w-[380px] items-start gap-3 rounded-field border-l-4 bg-card px-3 py-2.5 shadow-paper ${TONE[toast.tone]}`}
        >
          <p className="flex-1 font-body text-[12px] leading-[1.4] text-body">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Fechar aviso"
            className="-mr-1 -mt-1 rounded px-1.5 py-0.5 font-body text-[13px] leading-none text-[#8a8a80] hover:text-body"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
