import { Database, CheckCircle, AlertTriangle, XCircle, Users, Activity, Shield, Bell } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatNumber } from '@/utils/format';
import { CHART_COLORS } from '@/utils/constants';

function toChartData(record: Record<string, number>) {
  return Object.entries(record)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function formatRelativeDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('fr-FR');
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading, error, refetch } = useApi(
    () => adminApi.getDashboardStats(),
    []
  );

  if (isLoading) return <Loading fullPage text="Chargement du dashboard..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!stats) return null;

  const conformiteData = stats.par_statut_conformite ?? {};
  const conformes = conformiteData['Conforme'] ?? 0;
  const partiels = (conformiteData['Partiellement conforme'] ?? 0) + (conformiteData['Démarche achevée'] ?? 0);
  const nonConformes = (conformiteData['Non conforme'] ?? 0) + (conformiteData['Démarche en cours'] ?? 0);

  const workflowData = toChartData(stats.par_statut_workflow);
  const secteurData = toChartData(stats.par_secteur);
  const regionData = toChartData(stats.par_region).slice(0, 10);

  const summaryCards = [
    { label: 'Total Entités', value: stats.total_entites, icon: Database, color: '#FF8C00', bg: 'bg-orange-50' },
    { label: 'Conformes', value: conformes, icon: CheckCircle, color: '#228B22', bg: 'bg-green-50' },
    { label: 'Partiellement', value: partiels, icon: AlertTriangle, color: '#FF8C00', bg: 'bg-yellow-50' },
    { label: 'Non-conformes', value: nonConformes, icon: XCircle, color: '#DC143C', bg: 'bg-red-50' },
  ];

  const alertes = [
    { msg: `${stats.alertes_sans_dpo ?? 0} entités sans DPO désigné`, type: 'warn', count: stats.alertes_sans_dpo ?? 0 },
    { msg: `${stats.alertes_sans_declaration ?? 0} déclarations ARTCI manquantes`, type: 'error', count: stats.alertes_sans_declaration ?? 0 },
    { msg: `${stats.alertes_violations ?? 0} violations non notifiées`, type: 'warn', count: stats.alertes_violations ?? 0 },
  ].filter(a => a.count > 0);

  const activite: Array<{
    entite_denomination: string;
    modifie_par_nom: string;
    nouveau_statut: string | null;
    date: string | null;
  }> = stats.activite_recente ?? [];

  return (
    <div>
      <h1 className="text-2xl mb-6">Tableau de bord</h1>

      {/* Résumé - 4 cards conformité */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card ${bg}`}>
            <div className="flex items-center gap-4">
              <Icon className="w-10 h-10" style={{ color }} />
              <div>
                <p className="text-3xl font-bold">{formatNumber(value)}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Par statut workflow - Pie */}
        {workflowData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Par statut workflow</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workflowData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {workflowData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Par secteur - Pie */}
        {secteurData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Répartition par Secteur</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={secteurData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {secteurData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Alertes + Activité Récente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Alertes */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--artci-orange)]" />
            Alertes
          </h3>
          {alertes.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune alerte en cours.</p>
          ) : (
            <div className="space-y-3">
              {alertes.map((a, i) => (
                <div
                  key={i}
                  className="p-3 rounded text-sm"
                  style={{
                    background: a.type === 'error' ? '#f8d7da' : '#fff3cd',
                    borderLeft: `4px solid ${a.type === 'error' ? '#DC143C' : '#FFA500'}`,
                  }}
                >
                  <span className="font-semibold">{a.type === 'error' ? '❌' : '⚠️'}</span>{' '}
                  <strong>{a.count}</strong> {a.msg.replace(`${a.count} `, '')}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activité Récente */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--artci-green)]" />
            Activité Récente
          </h3>
          {activite.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune activité récente.</p>
          ) : (
            <div className="space-y-0">
              {activite.map((h, i) => (
                <div key={i} className="py-2 border-b border-gray-100 last:border-0 text-sm">
                  <strong>{h.modifie_par_nom}</strong> a modifié{' '}
                  <strong>{h.entite_denomination}</strong>
                  {h.nouveau_statut && (
                    <span className="text-gray-500"> → {h.nouveau_statut}</span>
                  )}
                  <br />
                  <span className="text-xs text-gray-400">{formatRelativeDate(h.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Par région - Bar */}
      {regionData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Par région (Top 10)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={regionData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#228B22" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats secondaires */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="card text-center">
          <Shield className="w-8 h-8 mx-auto mb-2 text-[var(--artci-green)]" />
          <p className="text-2xl font-bold">{stats.demandes_en_cours}</p>
          <p className="text-sm text-gray-500">Demandes en cours</p>
        </div>
        <div className="card text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="text-2xl font-bold">{stats.demandes_en_retard}</p>
          <p className="text-sm text-gray-500">En retard</p>
        </div>
        <div className="card text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold">{stats.agents_actifs}</p>
          <p className="text-sm text-gray-500">Agents actifs</p>
        </div>
      </div>
    </div>
  );
}
