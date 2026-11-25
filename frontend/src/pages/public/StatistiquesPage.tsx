import { Link } from 'react-router-dom';
import { CheckCircle2, CircleDashed, XCircle, Building2, Layers, MapPinned, BarChart3, Map as MapIcon } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useApi } from '@/hooks/useApi';
import * as publicApi from '@/api/public.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { formatNumber } from '@/utils/format';
import { ROUTES, STATUT_COLORS } from '@/utils/constants';

/** Palette des graphiques : charte (orange, vert, bleu nuit) puis teintes associees. */
const PALETTE = ['#FF8C00', '#009E49', '#0F172A', '#F59E0B', '#10B981', '#64748B', '#FDBA74', '#6EE7B7', '#334155', '#FCD34D'];

function toChartData(record: Record<string, number>) {
  return Object.entries(record)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #E5E7EB',
  boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
  fontSize: 13,
};

export default function StatistiquesPage() {
  const { data: stats, isLoading, error, refetch } = useApi(() => publicApi.getStats(), []);

  const header = (
    <PageHeader
      variant="band"
      icon={BarChart3}
      eyebrow="Indicateurs publics"
      title="Statistiques de la conformité"
      description="Répartition des organismes publiés par statut, secteur d'activité et territoire."
      actions={
        <Link to={ROUTES.MAP} className="btn btn-outline py-2 px-4 text-sm">
          <MapIcon className="w-4 h-4" />
          Voir sur la carte
        </Link>
      }
    />
  );

  if (isLoading) return <>{header}<Loading fullPage text="Chargement des statistiques..." /></>;
  if (error) return <>{header}<div className="max-w-7xl mx-auto px-4 md:px-8 py-8"><ErrorDisplay message={error} onRetry={refetch} /></div></>;
  if (!stats) return null;

  const conformes = stats.total_entites_conformes;
  const partiels = stats.total_partiellement_conformes ?? 0;
  const nonConformes = stats.total_non_conformes ?? 0;
  const total = conformes + partiels + nonConformes;
  const secteurData = toChartData(stats.par_secteur);
  const regionData = toChartData(stats.par_region);
  const villeData = toChartData(stats.par_ville).slice(0, 15);

  const kpis = [
    { label: 'Organismes publiés', value: total, icon: Building2, color: 'var(--brand-dark)' },
    { label: 'Conformes', value: conformes, icon: CheckCircle2, color: STATUT_COLORS['Conforme'] },
    { label: 'Partiellement conformes', value: partiels, icon: CircleDashed, color: STATUT_COLORS['Partiellement conforme'] },
    { label: 'Non conformes', value: nonConformes, icon: XCircle, color: STATUT_COLORS['Non conforme'] },
    { label: "Secteurs d'activité", value: secteurData.length, icon: Layers, color: 'var(--brand-secondary)' },
    { label: 'Régions couvertes', value: regionData.length, icon: MapPinned, color: 'var(--brand-primary)' },
  ];

  const partConforme = total > 0 ? Math.round((conformes / total) * 100) : 0;

  return (
    <>
      {header}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Indicateurs cles */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {kpis.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${color} 12%, #fff)`, color }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-3xl font-extrabold text-[var(--brand-dark)]">
                {formatNumber(value)}
              </p>
              <p className="text-sm text-[var(--brand-muted)]">{label}</p>
            </div>
          ))}
        </div>

        {total === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Aucune donnée publiée pour le moment"
            description="Les graphiques s'afficheront dès que l'ARTCI aura publié les premiers organismes évalués."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Repartition par statut */}
            <div className="card">
              <h3 className="text-lg mb-1">Répartition par statut</h3>
              <p className="text-sm text-[var(--brand-muted)] mb-4">{partConforme} % des organismes publiés sont pleinement conformes.</p>
              <div className="space-y-4">
                {[
                  { label: 'Conformes', value: conformes, color: STATUT_COLORS['Conforme'] },
                  { label: 'Partiellement conformes', value: partiels, color: STATUT_COLORS['Partiellement conforme'] },
                  { label: 'Non conformes', value: nonConformes, color: STATUT_COLORS['Non conforme'] },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-[var(--brand-text)]">{r.label}</span>
                      <span className="font-display font-bold text-[var(--brand-dark)]">{formatNumber(r.value)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-[var(--brand-gray)]">
                      <div className="h-full rounded-full" style={{ width: `${total ? (r.value / total) * 100 : 0}%`, background: r.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Par secteur - anneau + legende */}
            {secteurData.length > 0 && (
              <div className="card">
                <h3 className="text-lg mb-4">Par secteur d'activité</h3>
                <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={secteurData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
                        {secteurData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="space-y-1.5 text-sm">
                    {secteurData.slice(0, 8).map((d, i) => (
                      <li key={d.name} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span className="flex-1 truncate text-[#334155]">{d.name}</span>
                        <span className="font-semibold text-[var(--brand-dark)]">{d.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Par region */}
            {regionData.length > 0 && (
              <div className="card">
                <h3 className="text-lg mb-4">Par région</h3>
                <ResponsiveContainer width="100%" height={Math.max(220, regionData.length * 34)}>
                  <BarChart data={regionData} layout="vertical" margin={{ left: 10, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#334155' }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,140,0,0.06)' }} />
                    <Bar dataKey="value" name="Organismes" fill="#FF8C00" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Par ville */}
            {villeData.length > 0 && (
              <div className="card">
                <h3 className="text-lg mb-4">Par ville <span className="text-sm font-normal text-[var(--brand-muted)]">(15 premières)</span></h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={villeData} margin={{ right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} angle={-30} textAnchor="end" height={70} interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,158,73,0.06)' }} />
                    <Bar dataKey="value" name="Organismes" fill="#009E49" radius={[6, 6, 0, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
