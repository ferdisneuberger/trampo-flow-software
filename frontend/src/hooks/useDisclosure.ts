import { useCallback, useState } from 'react';

export type UseDisclosureResult = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export function useDisclosure(initialOpen = false): UseDisclosureResult {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, open, close };
}
