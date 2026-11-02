/**
 * O quadro é horizontal em todos os tamanhos. No mobile cada coluna tem uma
 * largura confortável e o container rola lateralmente; a partir de `md` ele
 * passa a distribuir as colunas na largura disponível.
 */
export const BOARD_GRID_CLASSES =
  'grid grid-flow-col auto-cols-[minmax(18rem,1fr)] gap-4 md:grid-flow-row md:grid-cols-2 xl:min-w-[78rem] xl:grid-cols-4';

export const BOARD_SCROLL_CLASSES = 'overflow-x-auto pb-1';
