import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { invalidateApplicationData } from '../lib/invalidate';
import { queryKeys } from '../lib/query-keys';
import { applicationsService } from '../services/api/applications.service';
import {
  APPLICATION_STATUSES,
  type ApplicationBoard,
  type ApplicationStatus,
  type PlaceApplicationInput,
} from '../services/applications.types';

export type PlaceApplicationVariables = PlaceApplicationInput & {
  id: string;
};

function statusFromDroppableId(id: string): ApplicationStatus | null {
  const match = id.startsWith('column-') ? id.slice('column-'.length) : null;

  return match && APPLICATION_STATUSES.includes(match as ApplicationStatus)
    ? (match as ApplicationStatus)
    : null;
}

/**
 * Atualização otimista do quadro. Atualiza a ordem dos itens e os totais
 * das colunas de origem/destino.
 */
export function applyPlacement(
  board: ApplicationBoard,
  variables: PlaceApplicationVariables,
): ApplicationBoard {
  const moving = board.columns
    .flatMap((column) => column.items)
    .find((item) => item.id === variables.id);

  if (!moving) {
    return board;
  }

  const sourceStatus = moving.status;
  const destinationStatus = variables.status ?? moving.status;

  const columns = board.columns.map((column) => ({
    ...column,
    items: column.items.filter((item) => item.id !== variables.id),
  }));

  const destination = columns.find(
    (column) => column.status === destinationStatus,
  );

  if (!destination) {
    return board;
  }

  const beforeIndex = variables.beforeId
    ? destination.items.findIndex((item) => item.id === variables.beforeId)
    : -1;

  const afterIndex = variables.afterId
    ? destination.items.findIndex((item) => item.id === variables.afterId)
    : -1;

  let insertAt = destination.items.length;

  if (beforeIndex >= 0) {
    insertAt = beforeIndex + 1;
  } else if (afterIndex >= 0) {
    insertAt = afterIndex;
  }

  const moved = { ...moving, status: destinationStatus };
  const items = [...destination.items];

  items.splice(insertAt, 0, moved);

  return {
    columns: columns.map((column) => {
      if (column.status === destinationStatus) {
        return {
          ...column,
          items,
          total:
            column.status === sourceStatus ? column.total : column.total + 1,
        };
      }

      if (column.status === sourceStatus) {
        return { ...column, total: Math.max(0, column.total - 1) };
      }

      return column;
    }),
  };
}

/**
 * Traduz o drop do dnd-kit no payload de placement da API.
 * Retorna null para drops no-op (inclusive soltar o card sobre ele mesmo).
 */
export function resolvePlacement(
  board: ApplicationBoard,
  activeId: string,
  overId: string,
): PlaceApplicationVariables | null {
  if (activeId === overId) {
    return null;
  }

  const dragged = board.columns
    .flatMap((column) => column.items)
    .find((item) => item.id === activeId);

  if (!dragged) {
    return null;
  }

  const overColumnStatus = statusFromDroppableId(overId);
  const overCard = board.columns
    .flatMap((column) => column.items)
    .find((item) => item.id === overId);
  const destinationStatus =
    overColumnStatus ?? overCard?.status ?? dragged.status;
  const destination = board.columns.find(
    (column) => column.status === destinationStatus,
  );

  if (!destination) {
    return null;
  }

  const withoutDragged = destination.items.filter(
    (item) => item.id !== dragged.id,
  );

  if (overColumnStatus) {
    const last = withoutDragged.at(-1);

    return {
      id: dragged.id,
      status: destinationStatus,
      beforeId: last?.id,
    };
  }

  const targetIndex = withoutDragged.findIndex((item) => item.id === overId);

  if (targetIndex < 0) {
    return { id: dragged.id, status: destinationStatus };
  }

  return {
    id: dragged.id,
    status: destinationStatus,
    beforeId: withoutDragged[targetIndex - 1]?.id,
    afterId: withoutDragged[targetIndex]?.id,
  };
}

export function useBoard(search?: string) {
  return useQuery({
    queryKey: queryKeys.board(search),
    queryFn: () => applicationsService.board({ search: search || undefined }),
    placeholderData: keepPreviousData,
  });
}

export function usePlaceApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: PlaceApplicationVariables) =>
      applicationsService.place(variables.id, {
        status: variables.status,
        beforeId: variables.beforeId,
        afterId: variables.afterId,
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['board'] });

      const snapshots = queryClient.getQueriesData<ApplicationBoard>({
        queryKey: ['board'],
      });

      queryClient.setQueriesData<ApplicationBoard>(
        { queryKey: ['board'] },
        (current) => (current ? applyPlacement(current, variables) : current),
      );

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: (_data, _error, variables) => {
      invalidateApplicationData(queryClient, variables.id);
    },
  });
}
