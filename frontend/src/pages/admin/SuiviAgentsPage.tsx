/**
 * Page "Suivi d'activité des agents" (spec §5.1, §5.2 reunion 07/05/2026).
 * Reservée Admin / Super Admin.
 */
import { Activity, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Éditeur',
  reader: 'Lecteur',
};

export default function SuiviAgentsPage() {
  const { data: agents, isLoading, error, refetch } = useApi(
    () => adminApi.getAgentsActivity(),
    []
  );

  if (isLoading) return <Loading fullPage text="Chargement de l'activité..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!agents || agents.length === 0) return <EmptyState title="Aucun agent" description="Aucun agent à suivre." />;

  // KPIs globaux
  const totalAffectes = agents.reduce((sum, a) => sum + a.nb_dossiers_affectes, 0);
  const totalTraites = agents.reduce((sum, a) => sum + a.nb_traites, 0);
  const totalEnRetard = agents.reduce((sum, a) => sum + a.nb_en_retard, 0);
  const totalTraitements = agents.reduce((sum, a) => sum + a.nb_traitements_total, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <Activity className="w-7 h-7 text-[var(--artci-orange)]" />
        Suivi d'activité des agents
      </h1>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Dossiers affectés" value={totalAffectes} icon={TrendingUp} color="text-blue-500" />
        <KpiCard label="Dossiers traités" value={totalTraites} icon={CheckCircle} color="text-green-500" />
        <KpiCard label="En retard" value={totalEnRetard} icon={Clock} color="text-red-500" />
        <KpiCard label="Traitements total" value={totalTraitements} icon={Activity} color="text-orange-500" />
      </div>

      {/* Tableau des performances */}
      <div className="card">
        <h3 className="text-lg font-bold mb-3">Performance individuelle</h3>
        <div className="table-container overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th className="text-center">Affectés</th>
                <th className="text-center">Traités</th>
                <th className="text-center">En cours</th>
                <th className="text-center">En retard</th>
                <th className="text-center">Traitements</th>
                <th className="text-center">Taux</th>
                <th>Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.agent_id}>
                  <td>
                    <div className="font-semibold text-sm">{a.prenom} {a.nom}</div>
                    <div className="text-xs text-gray-500">{a.email}</div>
                  </td>
                  <td>
                    <span className="badge badge-encours text-xs">
                      {ROLE_LABEL[a.role] ?? a.role}
                    </span>
                  </td>
                  <td>
                    {a.is_active ? (
                      <span className="text-xs text-green-600">● Actif</span>
                    ) : (
                      <span className="text-xs text-gray-400">○ Inactif</span>
                    )}
                  </td>
                  <td className="text-center font-semibold">{a.nb_dossiers_affectes}</td>
                  <td className="text-center text-green-600 font-semibold">{a.nb_traites}</td>
                  <td className="text-center text-orange-500">{a.nb_en_cours}</td>
                  <td className={cn('text-center', a.nb_en_retard > 0 ? 'text-red-600 font-bold' : 'text-gray-400')}>
                    {a.nb_en_retard}
                  </td>
                  <td className="text-center">
                    <span className="text-sm">{a.nb_traitements_valides}</span>
                    <span className="text-xs text-gray-400">/{a.nb_traitements_total}</span>
                  </td>
                  <td className="text-center">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        'text-sm font-bold',
                        a.taux_traitement >= 80 ? 'text-green-600'
                          : a.taux_traitement >= 50 ? 'text-orange-500'
                            : 'text-red-600',
                      )}>{a.taux_traitement}%</span>
                      <div className="w-16 h-1 bg-gray-200 rounded mt-1">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${a.taux_traitement}%`,
                            background: a.taux_traitement >= 80 ? '#228B22'
                              : a.taux_traitement >= 50 ? '#FF8C00' : '#DC143C',
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="text-xs text-gray-500">
                    {a.last_login ? formatDateTime(a.last_login) : 'Jamais'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, color,
}: { label: string; value: number; icon: typeof Activity; color: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <Icon className={cn('w-8 h-8', color)} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
