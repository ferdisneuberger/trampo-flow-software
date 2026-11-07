import { useEffect, useState } from 'react';

/**
 * Media query com fallback para ambientes sem `matchMedia` (testes e SSR).
 * Nesses ambientes assumimos `true` para manter o layout desktop acessível.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return true;
    }

    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);

    handleChange();
    media.addEventListener('change', handleChange);

    return () => media.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
