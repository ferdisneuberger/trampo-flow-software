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
import { resolvePlacement, usePlaceApplication } from '../../hooks/useBoard';
import type {
  Application,
  ApplicationBoard,
} from '../../services/applications.types';
import { getErrorMessage } from '../../utils/errors';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { BOARD_GRID_CLASSES, BOARD_SCROLL_CLASSES } from './board-layout';
import { BoardColumn } from './BoardColumn';

type BoardProps = {
  board: ApplicationBoard;
  search?: string;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

export function Board({ board, search, onEdit, onDelete }: BoardProps) {
  const place = usePlaceApplication();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const columns = board.columns;
  const activeApplication = columns
    .flatMap((column) => column.items)
    .find((item) => item.id === activeId);
  const draggingEnabled = !search;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    if (!event.over || place.isPending) {
      return;
    }

    const variables = resolvePlacement(
      board,
      String(event.active.id),
      String(event.over.id),
    );

    if (variables) {
      place.mutate(variables);
    }
  };

  const moveToStatus = (
    application: Application,
    status: Application['status'],
  ) => {
    if (application.status === status || place.isPending) {
      return;
    }

    place.mutate({ id: application.id, status });
  };

  return (
    <div className="space-y-3">
      {!draggingEnabled && (
        <p className="text-xs text-ink-500">
          Reordenação por arrastar desativada enquanto há busca ativa. Use o
          menu do card para mudar de coluna.
        </p>
      )}

      {place.isError && (
        <Alert
          tone="error"
          title="Não foi possível mover a candidatura"
          description={getErrorMessage(place.error)}
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => place.reset()}
            >
              Fechar
            </Button>
          }
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className={BOARD_SCROLL_CLASSES}>
          <div className={BOARD_GRID_CLASSES}>
            {columns.map((column) => (
              <BoardColumn
                key={column.status}
                status={column.status}
                total={column.total}
                items={column.items}
                hasMore={column.hasMore}
                draggingEnabled={draggingEnabled}
                onMove={moveToStatus}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeApplication ? (
            <div className="w-72 rounded-lg border border-brand-300 bg-white p-3 shadow-none">
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
