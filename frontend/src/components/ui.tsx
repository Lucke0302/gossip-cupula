import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

/* Primitivas de formulario e botao, todas com os tokens do design. */

const FIELD_BASE =
  'w-full rounded-field border bg-field px-[10px] py-[9px] font-body text-[12.5px] leading-[1.35] text-body shadow-sunken placeholder:text-[#9d9d92] focus:border-welcome focus:bg-white focus:shadow-focusring focus:outline-none disabled:opacity-60';

export const Label = ({ htmlFor, children }: { htmlFor: string; children: ReactNode }) => (
  <label
    htmlFor={htmlFor}
    className="mb-[5px] block font-body text-[10px] uppercase leading-none tracking-[.06em] text-[#666]"
  >
    {children}
  </label>
);

export const FieldError = ({ id, children }: { id: string; children?: ReactNode }) =>
  children ? (
    <p id={id} role="alert" className="mt-1.5 font-body text-[10.5px] leading-[1.4] text-[#c0392b]">
      {children}
    </p>
  ) : null;

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ invalid, className = '', ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={`${FIELD_BASE} ${invalid ? 'border-[#c0392b]' : 'border-field-border'} ${className}`}
      {...props}
    />
  ),
);
TextInput.displayName = 'TextInput';

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ invalid, className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={`${FIELD_BASE} resize-y ${invalid ? 'border-[#c0392b]' : 'border-field-border'} ${className}`}
    {...props}
  />
));
TextArea.displayName = 'TextArea';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  block?: boolean;
};

export function Button({
  variant = 'primary',
  block = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const tone =
    variant === 'primary'
      ? 'bg-fofocas text-white shadow-btn hover:bg-[#d96a31] active:translate-y-px'
      : 'bg-[#f2f2ea] text-[#555] hover:bg-[#e8e8dd] active:translate-y-px';

  return (
    <button
      className={`inline-flex items-center justify-center rounded-field px-5 py-2 font-display text-[14px] font-normal leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${tone} ${
        block ? 'w-full px-3 py-[11px] text-[15px]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// forwardRef e' obrigatorio: o `register` do react-hook-form entrega um ref.
export const Checkbox = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { id: string; label: ReactNode }
>(({ id, label, ...props }, ref) => (
  <div className="flex items-start gap-1.5">
    <input
      ref={ref}
      id={id}
      type="checkbox"
      className="mt-[2px] h-3 w-3 flex-none rounded-[2px] border border-[#b9b9ac] accent-fofocas"
      {...props}
    />
    <label htmlFor={id} className="font-body text-[10.5px] leading-[1.4] text-[#555]">
      {label}
    </label>
  </div>
));
Checkbox.displayName = 'Checkbox';
