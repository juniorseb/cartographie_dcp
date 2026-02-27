import { CheckCircle, Clock, Activity } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useApi } from '@/hooks/useApi';
import * as publicApi from '@/api/public.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatNumber } from '@/utils/format';
import { CHART_COLORS } from '@/utils/constants';

function toChartData(record: Record<string, number>) {
  return Object.entries(record)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export default function StatistiquesPage() {
  const { data: stats, isLoading, error, refetch } = useApi(
    () => publicApi.getStats(),
    []
  );

  if (isLoading) return <Loading fullPage text="Chargement des statistiques..." />;
  if (error) return <div className="max-w-7xl mx-auto px-4 py-6"><ErrorDisplay message={error} onRetry={refetch} /></div>;
  if (!stats) return null;

  const secteurData = toChartData(stats.par_secteur);
  const regionData = toChartData(stats.par_region);
  const villeData = toChartData(stats.par_ville).slice(0, 15);

  const summaryCards = [
    { label: 'Entités Conformes', value: stats.total_entites_conformes, icon: CheckCircle, color: 'var(--artci-green)', cardClass: 'card card-green' },
    { label: 'Démarche Achevée', value: stats.total_demarche_achevee, icon: Clock, color: 'var(--artci-orange)', cardClass: 'card card-orange' },
    { label: 'Démarche en Cours', value: stats.total_demarche_en_cours, icon: Activity, color: 'var(--status-encours)', cardClass: 'card' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl mb-6">Statistiques Publiques</h1>

      {/* Résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
        {/* Par secteur - Pie */}
        {secteurData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Par secteur d'activité</h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={secteurData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
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
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Par région</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={regionData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#FF8C00" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Par ville - Bar */}
        {villeData.length > 0 && (
          <div className="card lg:col-span-2">
            <h3 className="text-lg font-bold mb-4">Par ville (Top 15)</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={villeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#228B22" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
