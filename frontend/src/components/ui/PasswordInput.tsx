import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Input, type InputProps } from './Input';

type PasswordInputProps = Omit<InputProps, 'type' | 'trailing'>;

export function PasswordInput(props: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <Input
      {...props}
      type={isVisible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={isVisible}
          className="grid size-9 place-items-center rounded-lg text-ink-500 transition hover:bg-accent-soft hover:text-ink-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt/20"
        >
          {isVisible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      }
    />
  );
}
