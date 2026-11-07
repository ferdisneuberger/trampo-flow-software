import { useState } from 'react';
import { useApplicationMutations } from '../../hooks/useApplicationMutations';
import type {
  Application,
  DeleteApplicationMode,
} from '../../services/applications.types';
import { getErrorMessage } from '../../utils/errors';
import { Alert } from '../ui/Alert';
import { ConfirmDialog } from '../ui/ConfirmDialog';

type DeleteApplicationDialogProps = {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: (mode: DeleteApplicationMode) => void;
};

export function DeleteApplicationDialog({
  application,
  isOpen,
  onClose,
  onDeleted,
}: DeleteApplicationDialogProps) {
  const { deleteApplication } = useApplicationMutations();
  const [mode, setMode] = useState<DeleteApplicationMode>('soft');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isDeleting) {
      return;
    }

    onClose();
  };

  const handleConfirm = async () => {
    if (!application || !isConfirmed || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteApplication(application.id, mode);
      onClose();
      onDeleted?.(mode);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Excluir candidatura"
      description={
        application
          ? mode === 'hard'
            ? `A candidatura "${application.title}" será removida permanentemente. Esta ação não pode ser desfeita.`
            : `A candidatura "${application.title}" será arquivada e deixará de aparecer no quadro.`
          : ''
      }
      confirmLabel={
        mode === 'hard' ? 'Excluir permanentemente' : 'Arquivar candidatura'
      }
      isLoading={isDeleting}
      confirmDisabled={!isConfirmed}
      onConfirm={() => void handleConfirm()}
      onClose={handleClose}
    >
      {error && (
        <div className="mt-4">
          <Alert
            tone="error"
            title="Não foi possível excluir a candidatura"
            description={error}
          />
        </div>
      )}

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-ink-900 bg-danger-soft p-4 text-sm shadow-hard-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-2 border-ink-900 accent-coral"
          checked={isConfirmed}
          onChange={(event) => setIsConfirmed(event.target.checked)}
          disabled={isDeleting}
        />
        <span>
          <span className="block font-bold text-coral-dark">
            Confirmo a exclusão
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-ink-700">
            Entendo que a candidatura será removida do quadro e que esta ação
            exige confirmação explícita.
          </span>
        </span>
      </label>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-ink-900 bg-surface p-4 text-sm shadow-hard-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-2 border-ink-900 accent-coral"
          checked={mode === 'hard'}
          onChange={(event) => {
            setMode(event.target.checked ? 'hard' : 'soft');
            setIsConfirmed(false);
          }}
          disabled={isDeleting}
        />
        <span>
          <span className="block font-bold text-ink-900">
            Excluir permanentemente
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-ink-500">
            Remove o registro do banco de dados. Sem esta opção, a candidatura é
            apenas arquivada (exclusão lógica).
          </span>
        </span>
      </label>
    </ConfirmDialog>
  );
}
