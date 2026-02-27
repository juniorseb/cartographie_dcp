import { Database, AlertTriangle, Users, Activity } from 'lucide-react';
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

export default function AdminDashboardPage() {
  const { data: stats, isLoading, error, refetch } = useApi(
    () => adminApi.getDashboardStats(),
    []
  );

  if (isLoading) return <Loading fullPage text="Chargement du dashboard..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!stats) return null;

  const workflowData = toChartData(stats.par_statut_workflow);
  const secteurData = toChartData(stats.par_secteur);
  const regionData = toChartData(stats.par_region).slice(0, 10);

  const summaryCards = [
    { label: 'Total Entités', value: stats.total_entites, icon: Database, color: 'var(--artci-orange)', cardClass: 'card card-orange' },
    { label: 'Demandes en Cours', value: stats.demandes_en_cours, icon: Activity, color: 'var(--status-encours)', cardClass: 'card' },
    { label: 'En Retard', value: stats.demandes_en_retard, icon: AlertTriangle, color: 'var(--status-rejete)', cardClass: 'card' },
    { label: 'Agents Actifs', value: stats.agents_actifs, icon: Users, color: 'var(--artci-green)', cardClass: 'card card-green' },
  ];

  return (
    <div>
      <h1 className="text-2xl mb-6">Tableau de bord</h1>

      {/* Résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map(({ label, value, icon: Icon, color, cardClass }) => (
          <div key={label} className={cardClass}>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <h3 className="text-lg font-bold mb-4">Par secteur d'activité</h3>
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

        {/* Par région - Bar */}
        {regionData.length > 0 && (
          <div className="card lg:col-span-2">
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
      </div>
    </div>
  );
}
