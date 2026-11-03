import { useCallback, useEffect, useRef } from 'react';

export const DRAG_CLICK_GUARD_MS = 350;

/**
 * Ignora o clique gerado logo após um arraste terminar.
 *
 * O dnd-kit interrompe a propagação desse clique no document, então o onClick
 * do card nunca roda e o evento cai no default action do navegador. No
 * Safari/iOS o click é disparado no elemento do touchstart (o link do card),
 * o que abriria os detalhes mesmo depois de mover o card de coluna.
 *
 * Enquanto a trava está armada, o clique é cancelado na fase de captura e a
 * trava é liberada na hora, sem consumir o próximo clique do usuário.
 */
export function useDragClickGuard(guardMs = DRAG_CLICK_GUARD_MS) {
  const suppressedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const release = useCallback(() => {
    suppressedRef.current = false;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const arm = useCallback(() => {
    suppressedRef.current = true;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    // Rede de segurança: se o navegador não gerar o clique do drop, a trava
    // não pode continuar bloqueando o próximo clique de verdade.
    timeoutRef.current = window.setTimeout(release, guardMs);
  }, [guardMs, release]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!suppressedRef.current) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      release();
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      release();
    };
  }, [release]);

  return arm;
}
