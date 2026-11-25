import { useState, useCallback } from 'react';
import { Database, Activity, AlertTriangle, Users, Download } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import { downloadFile } from '@/api/client';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatNumber } from '@/utils/format';
import { CHART_COLORS } from '@/utils/constants';
import type { AdminStatsFilter } from '@/types/admin';

function toChartData(record: Record<string, number>) {
  return Object.entries(record)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export default function StatistiquesAdminPage() {
  const [filters, setFilters] = useState<AdminStatsFilter>({});
  const [exporting, setExporting] = useState(false);

  const fetchStats = useCallback(
    () => adminApi.getAdvancedStats(filters),
    [filters]
  );
  const { data: stats, isLoading, error, refetch } = useApi(fetchStats, [filters]);

  function updateFilter(key: keyof AdminStatsFilter, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await downloadFile('/admin/entites/export', `entites-${today}.xlsx`, { format: 'excel' });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Export entités a échoué', e);
      alert("L'export a échoué. Veuillez réessayer.");
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) return <Loading fullPage text="Chargement des statistiques..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!stats) return null;

  const workflowData = toChartData(stats.par_statut_workflow);
  const conformiteData = toChartData(stats.par_statut_conformite);
  const secteurData = toChartData(stats.par_secteur);
  const regionData = toChartData(stats.par_region).slice(0, 10);
  const origineData = toChartData(stats.par_origine);

  const summaryCards = [
    { label: 'Total Entités', value: stats.total_entites, icon: Database, color: 'var(--brand-primary)', cardClass: 'card card-orange' },
    { label: 'Demandes assignées', value: stats.demandes_en_cours, icon: Activity, color: 'var(--status-encours)', cardClass: 'card' },
    { label: 'En Retard', value: stats.demandes_en_retard, icon: AlertTriangle, color: 'var(--status-rejete)', cardClass: 'card' },
    { label: 'Agents Actifs', value: stats.agents_actifs, icon: Users, color: 'var(--brand-secondary)', cardClass: 'card card-green' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--brand-primary-hover)]">Administration ARTCI</p>
          <h1 className="mt-1 text-2xl md:text-[28px]">Statistiques avancées</h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Analyse de l'ensemble des dossiers, filtrable par période.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="btn btn-outline text-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Export en cours…' : 'Export Excel'}
        </button>
      </div>

      {/* Filtres période */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="form-group mb-0">
            <label className="text-xs font-semibold">Date début</label>
            <input
              type="date"
              value={filters.date_debut ?? ''}
              onChange={(e) => updateFilter('date_debut', e.target.value)}
            />
          </div>
          <div className="form-group mb-0">
            <label className="text-xs font-semibold">Date fin</label>
            <input
              type="date"
              value={filters.date_fin ?? ''}
              onChange={(e) => updateFilter('date_fin', e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              className="btn btn-outline text-sm w-full"
              onClick={() => setFilters({})}
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map(({ label, value, icon: Icon, color, cardClass }) => (
          <div key={label} className={`${cardClass.replace(/card-(orange|green)/, '')} p-5`} style={{ borderTop: `3px solid ${color}` }}>
            <div className="flex items-center gap-4">
              <span
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${color} 12%, #fff)`, color }}
              >
                <Icon className="w-6 h-6" />
              </span>
              <div>
                <p className="font-display text-3xl font-extrabold text-[var(--brand-dark)]">{formatNumber(value)}</p>
                <p className="text-sm text-[var(--brand-muted)]">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statut workflow - Pie */}
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
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="none"
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

        {/* Statut conformité - Pie */}
        {conformiteData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Par statut conformité</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={conformiteData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="none"
                >
                  {conformiteData.map((_, i) => (
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
            <ResponsiveContainer width="100%" height={Math.max(260, secteurData.length * 28)}>
              <BarChart data={secteurData} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis type="category" dataKey="name" width={170} interval={0} tick={{ fontSize: 12, fill: '#334155' }} />
                <Tooltip cursor={{ fill: 'rgba(255,140,0,0.06)' }} />
                <Bar dataKey="value" name="Entités" fill="#FF8C00" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Par origine - Pie */}
        {origineData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Par origine de saisie</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={origineData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="none"
                >
                  {origineData.map((_, i) => (
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
                <Bar dataKey="value" fill="#009E49" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
