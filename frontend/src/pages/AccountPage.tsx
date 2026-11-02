import { LogOut, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';

export function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Conta" description="Sessão atual e encerramento." />

      <Card className="max-w-xl p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-700">
            <UserRound className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">
              {user?.username}
            </p>
            <p className="text-xs text-ink-500">Sessão autenticada por token</p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-ink-700">
          O access token fica apenas em memória e é renovado automaticamente. O
          refresh token fica em cookie inacessível a scripts.
        </p>

        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={handleLogout}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Encerrar sessão
        </Button>
      </Card>
    </div>
  );
}
