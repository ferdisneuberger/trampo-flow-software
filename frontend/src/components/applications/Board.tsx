import {
  pointerWithin,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import { useDragClickGuard } from '../../hooks/useDragClickGuard';
import { resolvePlacement, usePlaceApplication } from '../../hooks/useBoard';
import type {
  Application,
  ApplicationBoard,
} from '../../services/applications.types';
import { getErrorMessage } from '../../utils/errors';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { BOARD_GRID_CLASSES, BOARD_SCROLL_CLASSES } from './board-layout';
import { BoardCardOverlay } from './BoardCard';
import { BoardColumn } from './BoardColumn';

type BoardProps = {
  board: ApplicationBoard;
  search?: string;
  onEdit: (application: Application) => void;
  onDelete: (application: Application) => void;
};

export function Board({ board, search, onEdit, onDelete }: BoardProps) {
  const place = usePlaceApplication();
  const armDragClickGuard = useDragClickGuard();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const columns = board.columns;
  const activeApplication = columns
    .flatMap((column) => column.items)
    .find((item) => item.id === activeId);
  const draggingEnabled = !search && !place.isPending;

  const handleDragStart = (event: DragStartEvent) => {
    armDragClickGuard();
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    // Rearma a trava: o clique do drop chega depois deste handler.
    armDragClickGuard();

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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {search ? (
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.04em] text-ink-500">
          Reordenação por arrastar desativada enquanto há busca ativa. Use o
          menu do card para mudar de coluna.
        </p>
      ) : place.isPending ? (
        <p
          role="status"
          className="font-mono text-[10px] font-bold uppercase tracking-[0.04em] text-ink-500"
        >
          Sincronizando o quadro...
        </p>
      ) : null}

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
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          armDragClickGuard();
        }}
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

        <DragOverlay
          // A animação padrão do dnd-kit mira o retângulo do card de origem e
          // só depois o quadro é atualizado. Como o card muda de coluna, ela
          // parecia "voltar" para o lugar antigo; sem animação, o card surge
          // direto na posição nova com a atualização otimista.
          dropAnimation={null}
        >
          {activeApplication ? (
            <BoardCardOverlay application={activeApplication} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
