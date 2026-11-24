/**
 * Tableau de bord de l'editeur : suivi de sa performance personnelle.
 * Affiche : compteurs (total/en cours/traites/en retard/echeance proche),
 * delai moyen de traitement, derniers dossiers traites, panier actuel.
 */
import { Link } from 'react-router-dom';
import {
  Briefcase, CheckCircle2, Clock, AlertTriangle, Calendar,
  TrendingUp, Eye,
} from 'lucide-react';
import type { EditorPerformance } from '@/types/admin';

interface EditorDashboardPageProps {
  data: EditorPerformance;
}

function formatRelative(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `Il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString('fr-FR');
}

function classerEcheance(echeance?: string | null) {
  if (!echeance) return { label: 'Sans échéance', className: 'bg-gray-100 text-gray-600' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(echeance); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `En retard (${Math.abs(diff)} j)`, className: 'bg-red-100 text-red-800 border border-red-200' };
  if (diff === 0) return { label: "Aujourd'hui", className: 'bg-orange-100 text-orange-800 border border-orange-200' };
  if (diff <= 3) return { label: `Dans ${diff} j`, className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' };
  return { label: `Dans ${diff} j`, className: 'bg-blue-50 text-blue-800 border border-blue-200' };
}

export default function EditorDashboardPage({ data }: EditorDashboardPageProps) {
  const { compteurs, delai_moyen_traitement_jours, taux_traitement_pct, derniers_traites, panier_actuel } = data;

  const cards = [
    { label: 'Total assignés', value: compteurs.total, icon: Briefcase, color: 'text-gray-700', bg: 'bg-gray-50' },
    { label: 'En cours', value: compteurs.en_cours, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Traités', value: compteurs.traitees, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'En retard', value: compteurs.en_retard, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Échéance proche', value: compteurs.echeance_proche, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl mb-1">Mon suivi de performance</h1>
        <p className="text-sm text-gray-600">
          Vue personnelle de votre charge de travail et de vos résultats.
        </p>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card ${bg}`}>
            <div className="flex items-center gap-3">
              <Icon className={`w-7 h-7 ${color}`} />
              <div>
                <p className="text-2xl font-bold leading-none">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicateurs de performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-[var(--brand-secondary)]" />
            <h3 className="font-bold text-sm">Taux de traitement</h3>
          </div>
          <p className="text-3xl font-bold text-[var(--brand-secondary)]">
            {taux_traitement_pct}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {compteurs.traitees} dossier(s) traité(s) sur {compteurs.total} assigné(s).
          </p>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[var(--brand-secondary)] transition-all duration-300"
              style={{ width: `${Math.min(100, taux_traitement_pct)}%` }}
            />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-[var(--brand-primary)]" />
            <h3 className="font-bold text-sm">Délai moyen de traitement</h3>
          </div>
          <p className="text-3xl font-bold text-[var(--brand-primary)]">
            {delai_moyen_traitement_jours !== null
              ? `${delai_moyen_traitement_jours} j`
              : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {delai_moyen_traitement_jours !== null
              ? "Moyenne entre l'assignation et la fin du traitement."
              : "Pas encore de dossier traité pour calculer la moyenne."}
          </p>
        </div>
      </div>

      {/* Mon panier actuel */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[var(--brand-primary)]" />
          Mes dossiers en cours
        </h3>
        {panier_actuel.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun dossier en cours dans votre panier.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Entité</th>
                  <th>Assigné le</th>
                  <th>Échéance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {panier_actuel.map((a) => {
                  const verdict = classerEcheance(a.echeance);
                  return (
                    <tr key={a.assignation_id}>
                      <td className="font-semibold text-sm">
                        {a.entite_denomination ?? a.entite_id}
                      </td>
                      <td className="text-xs text-gray-600">
                        {a.date_assignation
                          ? new Date(a.date_assignation).toLocaleDateString('fr-FR')
                          : '-'}
                      </td>
                      <td>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${verdict.className}`}>
                          {verdict.label}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/admin/traiter/${a.entite_id}`}
                          className="text-[var(--brand-secondary)] hover:underline text-sm inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Traiter
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Derniers dossiers traites */}
      <div className="card">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[var(--brand-secondary)]" />
          Mes derniers dossiers traités
        </h3>
        {derniers_traites.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun dossier traité pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Entité</th>
                  <th>Statut</th>
                  <th>Traité</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {derniers_traites.map((a) => (
                  <tr key={a.assignation_id}>
                    <td className="font-semibold text-sm">
                      {a.entite_denomination ?? a.entite_id}
                    </td>
                    <td className="text-xs">
                      <span className="badge badge-achevee">{a.statut ?? '-'}</span>
                    </td>
                    <td className="text-xs text-gray-600">{formatRelative(a.traite_le)}</td>
                    <td className="text-right">
                      <Link
                        to={`/admin/entites/${a.entite_id}`}
                        className="text-[var(--brand-secondary)] hover:underline text-sm inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
