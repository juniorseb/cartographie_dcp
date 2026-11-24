/**
 * Dashboard admin/super_admin/reader.
 * Editor : redirection vers EditorDashboardPage (suivi de performance perso).
 *
 * Spec :
 * - Coherence metier : stats de conformite calculees uniquement sur les
 *   dossiers EVALUABLES (= soumis a l'ARTCI, pas les brouillons).
 * - Vision pilotage : KPI operationnels en haut (en attente assignation,
 *   assignes non traites, SLA depasse 7j, inscriptions a valider).
 * - Filtre temporel : Aujourd'hui / 7j / 30j / Tout.
 * - Camembert secteur remplace par bar chart horizontal lisible
 *   (regroupement automatique des secteurs < 2% en "Autres").
 * - Statuts workflow rendus avec libelles lisibles (mapping technique -> FR).
 */
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Database, CheckCircle, AlertTriangle, XCircle, Users, Activity,
  Inbox, Clock, UserPlus, Briefcase, Info,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatNumber } from '@/utils/format';
import { CHART_COLORS, ROUTES } from '@/utils/constants';
import {
  isEditorDashboard, labelStatutWorkflow,
  type AdminDashboardStats, type AdminStatsFilter,
} from '@/types/admin';
import EditorDashboardPage from './EditorDashboardPage';

type Period = 'today' | '7d' | '30d' | 'all';
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: 'all', label: 'Tout' },
];

function toChartData(record: Record<string, number>) {
  return Object.entries(record)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** Transforme un dictionnaire de secteurs en bar chart data, en regroupant
 *  les secteurs sous SEUIL_PCT% sous "Autres (n secteurs)". */
function buildSecteurChart(record: Record<string, number>) {
  const SEUIL_PCT = 2;
  const total = Object.values(record).reduce((a, b) => a + b, 0);
  if (total === 0) return { items: [] as { name: string; value: number; isAutres?: boolean }[], total: 0 };
  const sorted = toChartData(record);
  const minCount = Math.ceil((total * SEUIL_PCT) / 100);
  const principales = sorted.filter((s) => s.value >= minCount);
  const petites = sorted.filter((s) => s.value < minCount);
  const items: { name: string; value: number; isAutres?: boolean }[] = [...principales];
  if (petites.length > 0) {
    items.push({
      name: `Autres (${petites.length} secteur${petites.length > 1 ? 's' : ''})`,
      value: petites.reduce((a, b) => a + b.value, 0),
      isAutres: true,
    });
  }
  return { items, total };
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
  const [period, setPeriod] = useState<Period>('all');
  const [showAutres, setShowAutres] = useState(false);

  const fetcher = useCallback(() => {
    const filters: AdminStatsFilter = period === 'all' ? {} : { period };
    return adminApi.getDashboardStats(filters);
  }, [period]);

  const { data: stats, isLoading, error, refetch } = useApi(fetcher, [period]);

  if (isLoading) return <Loading fullPage text="Chargement du tableau de bord..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!stats) return null;

  // Cas Editor : on bascule sur la vue suivi de performance personnel.
  if (isEditorDashboard(stats)) {
    return <EditorDashboardPage data={stats} />;
  }

  const globalStats: AdminDashboardStats = stats;

  const conformiteData = globalStats.par_statut_conformite ?? {};
  const conformes = conformiteData['Conforme'] ?? 0;
  // Officiel : Partiellement conforme [70-99]. On agrege les anciens libelles
  // 'Demarche en cours' et 'Demarche achevee' dedans (rows historiques).
  const partiels = (conformiteData['Partiellement conforme'] ?? 0)
    + (conformiteData['Démarche achevée'] ?? 0)
    + (conformiteData['Démarche en cours'] ?? 0);
  const nonConformes = conformiteData['Non conforme'] ?? 0;
  const totalEvaluables = globalStats.total_evaluables ?? 0;
  // Brouillons = `brouillon` (entreprise) + `brouillon_artci` (saisie ARTCI).
  // Sans la 2e cle, l'alerte de coherence ne s'affichait pas quand seul un
  // brouillon ARTCI existait, et l'utilisateur voyait Total != somme conformite.
  const totalBrouillons =
    ((globalStats.par_statut_workflow ?? {})['brouillon'] ?? 0)
    + ((globalStats.par_statut_workflow ?? {})['brouillon_artci'] ?? 0);

  // Workflow data avec libelles lisibles
  const workflowData = toChartData(globalStats.par_statut_workflow)
    .map((d) => ({ ...d, name: labelStatutWorkflow(d.name) }));

  const secteurChart = buildSecteurChart(globalStats.par_secteur ?? {});
  const regionData = toChartData(globalStats.par_region ?? {}).slice(0, 10);

  // KPI operationnels : pilotage admin
  const kpiOps = [
    {
      label: "En attente d'assignation",
      value: globalStats.kpi_en_attente_assignation ?? 0,
      icon: Inbox, color: 'text-orange-700', bg: 'bg-orange-50',
      link: ROUTES.ADMIN_PANIER,
    },
    {
      label: 'Assignés non traités',
      value: globalStats.kpi_assignes_non_traites ?? 0,
      icon: Briefcase, color: 'text-blue-700', bg: 'bg-blue-50',
      link: ROUTES.ADMIN_ASSIGNATION,
    },
    {
      label: 'SLA dépassé (>7j)',
      value: globalStats.kpi_sla_depasse_7j ?? 0,
      icon: Clock, color: 'text-red-700', bg: 'bg-red-50',
      link: ROUTES.ADMIN_PANIER,
    },
    {
      label: 'Inscriptions à valider',
      value: globalStats.kpi_inscriptions_en_attente ?? 0,
      icon: UserPlus, color: 'text-purple-700', bg: 'bg-purple-50',
      link: ROUTES.ADMIN_INSCRIPTIONS,
    },
  ];

  // KPI statistiques (vision externe)
  const summaryCards = [
    { label: 'Total Entités', value: globalStats.total_entites, icon: Database, color: '#FF8C00', bg: 'bg-orange-50' },
    { label: 'Conformes', value: conformes, icon: CheckCircle, color: '#228B22', bg: 'bg-green-50' },
    { label: 'Partiellement', value: partiels, icon: AlertTriangle, color: '#FF8C00', bg: 'bg-yellow-50' },
    { label: 'Non-conformes', value: nonConformes, icon: XCircle, color: '#DC143C', bg: 'bg-red-50' },
  ];

  const activite = globalStats.activite_recente ?? [];

  return (
    <div>
      {/* En-tete + filtre temporel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl">Tableau de bord</h1>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-[var(--brand-secondary)] text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI OPERATIONNELS — cible admin (pilotage) */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-3">
          Pilotage opérationnel
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiOps.map(({ label, value, icon: Icon, color, bg, link }) => (
            <Link
              key={label}
              to={link}
              className={`card ${bg} hover:shadow transition-shadow no-underline`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-7 h-7 ${color}`} />
                <div>
                  <p className="text-2xl font-bold leading-none">{formatNumber(value)}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{label}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* KPI STATISTIQUES — vision externe */}
      <div className="mb-2">
        <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-3">
          Vue d'ensemble
        </h2>
      </div>

      {/* Note de coherence : la conformite n'est mesuree QUE sur les dossiers evalues */}
      {totalBrouillons > 0 && (
        <div className="alert alert-info mb-4 flex items-start gap-2 text-xs">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Les statistiques de conformité ci-dessous portent sur les{' '}
            <strong>{totalEvaluables}</strong> dossiers évalués (soumis à l'ARTCI).{' '}
            <strong>{totalBrouillons}</strong> dossier(s) en brouillon ne sont pas comptabilisés
            tant qu'ils n'ont pas été soumis.
          </span>
        </div>
      )}

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

      {/* Statut workflow + secteurs (chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Statut workflow : pie avec libelles lisibles */}
        {workflowData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Par statut de workflow</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workflowData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ percent }) => (percent < 0.05 ? '' : `${(percent * 100).toFixed(0)}%`)}
                  labelLine={false}
                >
                  {workflowData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatNumber(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Secteurs : bar chart horizontal trie + regroupement <2% en "Autres" */}
        {secteurChart.items.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Répartition par secteur</h3>
              <span className="text-xs text-gray-500">
                Total : {formatNumber(secteurChart.total)}
              </span>
            </div>
            <ResponsiveContainer
              width="100%"
              height={Math.max(220, secteurChart.items.length * 28 + 40)}
            >
              <BarChart
                data={secteurChart.items}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => [`${formatNumber(v)} (${((v / secteurChart.total) * 100).toFixed(1)}%)`, 'Entités']}
                />
                <Bar dataKey="value" fill="#FF8C00" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Drill-down : afficher la liste des secteurs regroupes sous "Autres" */}
            {secteurChart.items.some((i) => i.isAutres) && (
              <div className="mt-2 border-t border-gray-100 pt-2">
                <button
                  onClick={() => setShowAutres((v) => !v)}
                  className="text-xs text-[var(--brand-primary)] hover:underline"
                >
                  {showAutres ? 'Masquer' : 'Voir'} le détail de la catégorie "Autres"
                </button>
                {showAutres && (
                  <ul className="mt-2 max-h-40 overflow-y-auto text-xs grid grid-cols-2 gap-1">
                    {Object.entries(globalStats.par_secteur ?? {})
                      .filter(([name]) => !secteurChart.items.find((i) => i.name === name))
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, n]) => (
                        <li key={name} className="truncate">
                          <span className="text-gray-500">{n} ×</span> {name}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activité récente (le volet « Alertes » a été retiré) */}
      <div className="mb-6">
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--brand-secondary)]" />
            Activité récente
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
                    <span className="text-gray-500"> → {labelStatutWorkflow(h.nouveau_statut)}</span>
                  )}
                  <br />
                  <span className="text-xs text-gray-400">{formatRelativeDate(h.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Régions */}
      {regionData.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-bold mb-4">Par région (Top 10)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={regionData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#228B22" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats secondaires : assignations + agents */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <Briefcase className="w-8 h-8 mx-auto mb-2 text-[var(--brand-secondary)]" />
          <p className="text-2xl font-bold">{globalStats.demandes_en_cours}</p>
          <p className="text-sm text-gray-500">Demandes assignées</p>
        </div>
        <div className="card text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="text-2xl font-bold">{globalStats.demandes_en_retard}</p>
          <p className="text-sm text-gray-500">En retard</p>
        </div>
        <div className="card text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold">{globalStats.agents_actifs}</p>
          <p className="text-sm text-gray-500">Agents actifs</p>
        </div>
      </div>
    </div>
  );
}
