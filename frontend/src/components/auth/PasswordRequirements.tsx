import { Check, Circle } from 'lucide-react';
import { getPasswordRequirements } from '../../utils/password';
import { cn } from '../../utils/cn';

type PasswordRequirementsProps = {
  password: string;
  id?: string;
  className?: string;
};

export function PasswordRequirements({
  password,
  id,
  className,
}: PasswordRequirementsProps) {
  const requirements = getPasswordRequirements(password);
  const metCount = requirements.filter((requirement) => requirement.met).length;

  return (
    <div className={className}>
      <ul
        id={id}
        aria-label="Requisitos da senha"
        className="grid gap-1.5 sm:grid-cols-2"
      >
        {requirements.map((requirement) => (
          <li
            key={requirement.id}
            data-met={requirement.met}
            aria-label={`${requirement.label}: ${
              requirement.met ? 'atendido' : 'pendente'
            }`}
            className={cn(
              'flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.04em]',
              requirement.met ? 'text-green' : 'text-ink-500',
            )}
          >
            {requirement.met ? (
              <Check className="size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="size-2.5 shrink-0" aria-hidden="true" />
            )}
            {requirement.label}
          </li>
        ))}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {metCount} de {requirements.length} requisitos de senha atendidos.
      </p>
    </div>
  );
}
