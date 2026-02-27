import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Edit2, UserX } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import { formatDate } from '@/utils/format';
import { ROUTES, ITEMS_PER_PAGE } from '@/utils/constants';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Éditeur',
  reader: 'Lecteur',
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  const fetchUsers = useCallback(() => adminApi.getUsers(page, ITEMS_PER_PAGE), [page]);
  const { data, isLoading, error, refetch } = useApi(fetchUsers, [page]);

  async function handleDeactivate(id: string, nom: string) {
    if (!window.confirm(`Désactiver l'utilisateur ${nom} ?`)) return;
    setDeactivating(id);
    try {
      await adminApi.deactivateUser(id);
      refetch();
    } catch {
      // erreur silencieuse
    } finally {
      setDeactivating(null);
    }
  }

  if (isLoading) return <Loading fullPage text="Chargement..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl flex items-center gap-3">
          <Users className="w-7 h-7 text-[var(--artci-green)]" />
          Utilisateurs
        </h1>
        <Link
          to={ROUTES.ADMIN_USER_CREATE}
          className="btn btn-primary flex items-center gap-2 no-underline"
        >
          <Plus className="w-4 h-4" /> Nouveau
        </Link>
      </div>

      {!data || data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Dernière connexion</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.prenom} {u.nom}</td>
                    <td className="text-sm text-gray-500">{u.email}</td>
                    <td>
                      <span className="badge badge-encours">{ROLE_LABELS[u.role] ?? u.role}</span>
                    </td>
                    <td>
                      <span className={u.is_active ? 'badge badge-conforme' : 'badge badge-rejete'}>
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="text-sm text-gray-500">
                      {u.last_login ? formatDate(u.last_login) : '-'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/utilisateurs/${u.id}`}
                          className="btn btn-outline text-sm py-1 px-2 flex items-center gap-1 no-underline"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        {u.is_active && (
                          <button
                            className="btn text-sm py-1 px-2 flex items-center gap-1"
                            style={{ backgroundColor: 'var(--status-rejete)', color: 'white' }}
                            onClick={() => handleDeactivate(u.id, `${u.prenom} ${u.nom}`)}
                            disabled={deactivating === u.id}
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={data.pages}
            hasNext={data.has_next}
            hasPrev={data.has_prev}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
