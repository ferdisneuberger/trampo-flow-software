import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applicationsService } from '../services/api/applications.service';
import type {
  ApplicationBoard,
  PlaceApplicationInput,
} from '../services/applications.types';
import { getErrorMessage } from '../utils/errors';

export type PlaceApplicationVariables = PlaceApplicationInput & {
  id: string;
};

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
    columns: columns.map((column) =>
      column.status === destinationStatus ? { ...column, items } : column,
    ),
  };
}

export function useBoard(search?: string) {
  return useQuery({
    queryKey: ['board', search ?? ''],
    queryFn: () => applicationsService.board({ search: search || undefined }),
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
    onError: (error, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }

      return getErrorMessage(error);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['board'] });
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
