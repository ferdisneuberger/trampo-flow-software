import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from './button-styles';

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

/**
 * Link com a aparência de botão. Evita <a><button>, que é HTML inválido
 * e confunde leitores de tela.
 */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
