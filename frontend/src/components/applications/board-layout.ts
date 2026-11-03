/**
 * O quadro é horizontal em todos os tamanhos: as quatro colunas permanecem
 * sempre na mesma linha e o container rola lateralmente quando não há largura
 * suficiente. A partir de `xl` as colunas passam a dividir a largura
 * disponível.
 *
 * A altura é limitada pelo espaço restante da tela (`h-full` + `auto-rows-fr`)
 * para que as colunas não cresçam junto com os cards; cada coluna tem sua
 * própria rolagem vertical.
 */
export const BOARD_GRID_CLASSES =
  'grid h-full auto-rows-fr grid-flow-col auto-cols-[minmax(18rem,1fr)] gap-4 xl:min-w-[78rem] xl:grid-cols-4';

export const BOARD_SCROLL_CLASSES =
  'flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden pb-1';
