/**
 * Mon Panier — vue editeur ET admin/super_admin.
 *
 * - Editeur : voit ses assignations directes.
 * - Admin / Super Admin : voit en plus les NOUVELLES SOUMISSIONS non
 *   assignees ; il peut soit s'auto-traiter, soit assigner a un editeur.
 *   Spec : « Les nouvelles entites vont dans le 'mon panier' de super admin
 *   et admin et peuvent etre assignees dynamiquement. »
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, CheckCircle, Eye, Clock, FileSearch, UserPlus, FilePlus2 } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { hasMinRole } from '@/components/admin/AdminSidebar';
import { formatDate } from '@/utils/format';

const STATUT_BADGE_MAP: Record<string, string> = {
  en_cours: 'badge badge-encours',
  traite_attente_validation: 'badge badge-achevee',
  valide: 'badge badge-conforme',
  en_retard: 'badge badge-rejete',
};

export default function PanierPage() {
  const { user } = useAuth();
  const userRole = user?.role ?? 'reader';
  const canTraiter = hasMinRole(userRole, 'editor');
  const canAssigner = hasMinRole(userRole, 'admin');

  const { data: panier, isLoading, error, refetch } = useApi(
    () => adminApi.getPanier(),
    [],
  );
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleTraiter(id: string) {
    setProcessing(id);
    try {
      await adminApi.traiterAssignation(id);
      refetch();
      window.dispatchEvent(new Event('panier:updated'));
    } catch {
      // erreur silencieuse
    } finally {
      setProcessing(null);
    }
  }

  if (isLoading) return <Loading fullPage text="Chargement du panier..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  const assignations = panier?.assignations ?? [];
  const nouvelles = panier?.nouvelles_soumissions ?? [];
  const isEmpty = assignations.length === 0 && nouvelles.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1 className="text-2xl flex items-center gap-3">
          <Inbox className="w-7 h-7 text-[var(--artci-green)]" />
          Mon Panier
        </h1>
        {canAssigner && (
          <Link
            to="/admin/assignation"
            className="btn btn-primary text-sm flex items-center gap-2 no-underline"
          >
            <UserPlus className="w-4 h-4" /> Nouvelle assignation
          </Link>
        )}
      </div>

      {isEmpty ? (
        <EmptyState title="Panier vide" description="Aucune assignation ni nouvelle soumission à traiter." />
      ) : (
        <>
          {/* Section 1 : Nouvelles soumissions a assigner (admin/super) */}
          {canAssigner && nouvelles.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-3 flex items-center gap-2">
                <FilePlus2 className="w-4 h-4 text-[var(--artci-orange)]" />
                Nouvelles soumissions à assigner ({nouvelles.length})
              </h2>
              <div className="space-y-3">
                {nouvelles.map((n) => (
                  <div key={n.entite_id} className="card border-l-4 border-l-[var(--artci-orange)]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{n.entite_denomination ?? n.entite_id}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>N° CC {n.entite_numero_cc ?? '-'}</span>
                          {n.entite_ville && <span>• {n.entite_ville}</span>}
                          {n.entite_region && <span>• {n.entite_region}</span>}
                          {n.date_soumission && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Soumis le {formatDate(n.date_soumission)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Link
                          to={`/admin/entites/${n.entite_id}`}
                          className="btn btn-outline text-sm py-2 px-3 flex items-center gap-1 no-underline"
                        >
                          <Eye className="w-4 h-4" /> Voir
                        </Link>
                        {canTraiter && (
                          <Link
                            to={`/admin/traiter/${n.entite_id}`}
                            className="btn btn-secondary text-sm py-2 px-3 flex items-center gap-1 no-underline"
                          >
                            <FileSearch className="w-4 h-4" /> Traiter
                          </Link>
                        )}
                        {canAssigner && (
                          <Link
                            to={`/admin/assignation?entite=${n.entite_id}`}
                            className="btn btn-primary text-sm py-2 px-3 flex items-center gap-1 no-underline"
                          >
                            <UserPlus className="w-4 h-4" /> Assigner
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 2 : Mes assignations directes */}
          {assignations.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-3 flex items-center gap-2">
                <Inbox className="w-4 h-4 text-[var(--artci-green)]" />
                Mes assignations ({assignations.length})
              </h2>
              <div className="space-y-3">
                {assignations.map((item) => (
                  <div key={item.id} className="card">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.entite_denomination ?? item.entite_id}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={STATUT_BADGE_MAP[item.statut] ?? 'badge'}>{item.statut}</span>
                          {item.echeance && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              Échéance : {formatDate(item.echeance)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Link
                          to={`/admin/entites/${item.entite_id}`}
                          className="btn btn-outline text-sm py-2 px-3 flex items-center gap-1 no-underline"
                        >
                          <Eye className="w-4 h-4" /> Voir
                        </Link>
                        {canTraiter && (
                          <Link
                            to={`/admin/traiter/${item.entite_id}`}
                            className="btn btn-secondary text-sm py-2 px-3 flex items-center gap-1 no-underline"
                          >
                            <FileSearch className="w-4 h-4" /> Traiter
                          </Link>
                        )}
                        {canTraiter && item.statut === 'en_cours' && (
                          <button
                            className="btn btn-outline text-sm py-2 px-3 flex items-center gap-1"
                            onClick={() => handleTraiter(item.id)}
                            disabled={processing === item.id}
                            title="Marquer comme traité (assignation)"
                          >
                            {processing === item.id ? (
                              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Marquer traité
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
