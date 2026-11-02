import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import { useBoard, usePlaceApplication } from '../../hooks/useBoard';
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
} from '../../services/applications.types';
import { Alert } from '../ui/Alert';
import { BoardColumn } from './BoardColumn';

type BoardProps = {
  search?: string;
};

function statusFromDroppableId(id: string): ApplicationStatus | null {
  const match = id.startsWith('column-') ? id.slice('column-'.length) : null;

  return match && APPLICATION_STATUSES.includes(match as ApplicationStatus)
    ? (match as ApplicationStatus)
    : null;
}

export function Board({ search }: BoardProps) {
  const board = useBoard(search);
  const place = usePlaceApplication();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const columns = board.data?.columns ?? [];
  const activeApplication = columns
    .flatMap((column) => column.items)
    .find((item) => item.id === activeId);

  const draggingEnabled = !search;

  const moveToStatus = (
    application: Application,
    status: ApplicationStatus,
  ) => {
    if (application.status === status) {
      return;
    }

    place.mutate({ id: application.id, status });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;

    if (!over) {
      return;
    }

    const dragged = columns
      .flatMap((column) => column.items)
      .find((item) => item.id === active.id);

    if (!dragged) {
      return;
    }

    const overId = String(over.id);
    const overColumnStatus = statusFromDroppableId(overId);
    const overCard = columns
      .flatMap((column) => column.items)
      .find((item) => item.id === overId);
    const destinationStatus =
      overColumnStatus ?? overCard?.status ?? dragged.status;
    const destination = columns.find(
      (column) => column.status === destinationStatus,
    );

    if (!destination) {
      return;
    }

    const withoutDragged = destination.items.filter(
      (item) => item.id !== dragged.id,
    );

    if (overColumnStatus) {
      const last = withoutDragged.at(-1);

      place.mutate({
        id: dragged.id,
        status: destinationStatus,
        beforeId: last?.id,
      });

      return;
    }

    const targetIndex = withoutDragged.findIndex((item) => item.id === overId);

    if (targetIndex < 0) {
      place.mutate({ id: dragged.id, status: destinationStatus });
      return;
    }

    place.mutate({
      id: dragged.id,
      status: destinationStatus,
      beforeId: withoutDragged[targetIndex - 1]?.id,
      afterId: withoutDragged[targetIndex]?.id,
    });
  };

  if (board.isPending) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {APPLICATION_STATUSES.map((status) => (
          <div
            key={status}
            className="h-72 animate-pulse rounded-card border border-line bg-white"
          />
        ))}
      </div>
    );
  }

  if (board.isError) {
    return (
      <Alert
        tone="error"
        title="Não foi possível carregar o quadro"
        description="Tente atualizar a página."
      />
    );
  }

  return (
    <div className="space-y-3">
      {!draggingEnabled && (
        <p className="text-xs text-ink-500">
          Reordenação desativada enquanto há busca ativa. Use o menu do card
          para mudar de coluna.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <BoardColumn
              key={column.status}
              status={column.status}
              total={column.total}
              items={column.items}
              hasMore={column.hasMore}
              draggingEnabled={draggingEnabled}
              onMove={moveToStatus}
            />
          ))}
        </div>

        <DragOverlay>
          {activeApplication ? (
            <div className="w-64 rounded-lg border border-brand-300 bg-white p-3 shadow-none">
              <p className="line-clamp-2 text-sm font-semibold text-ink-900">
                {activeApplication.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-500">
                {activeApplication.company}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
