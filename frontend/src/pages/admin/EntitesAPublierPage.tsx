/**
 * Page dediee : Entites pretes a etre publiees sur la carte.
 * Filtre : statut_workflow = conforme_sous_reserve/valide ET publie_sur_carte = false.
 * Action : "Publier" en un clic depuis la liste.
 */
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import SearchBar from '@/components/common/SearchBar';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { ITEMS_PER_PAGE } from '@/utils/constants';
import type { AdminEntiteFilter } from '@/types/admin';

const STATUTS_PUBLIABLES = ['conforme_sous_reserve', 'valide'];

export default function EntitesAPublierPage() {
  const [search, setSearch] = useState('');
  const [statutFiltre, setStatutFiltre] = useState<string>('');
  const [page, setPage] = useState(1);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchPubliables = useCallback(() => {
    const filters: AdminEntiteFilter = {
      search: search || undefined,
      statut_workflow: statutFiltre || undefined,
      publie_sur_carte: false,
      page,
      per_page: ITEMS_PER_PAGE,
    };
    return adminApi.getEntites(filters);
  }, [search, statutFiltre, page]);

  const { data, isLoading, error, refetch } = useApi(fetchPubliables, [search, statutFiltre, page]);

  // Cote front, on applique un second filtre pour ne garder que les statuts publiables
  // si l'utilisateur n'a pas restreint via le select.
  const items = (data?.items ?? []).filter(
    (e) => !statutFiltre
      ? STATUTS_PUBLIABLES.includes(e.statut_workflow ?? '')
      : true
  );

  async function handlePublier(entiteId: string, denomination: string) {
    setPublishingId(entiteId);
    setFeedback(null);
    try {
      await adminApi.publierEntite(entiteId);
      setFeedback({ type: 'success', msg: `« ${denomination} » publié sur la carte.` });
      refetch();
    } catch {
      setFeedback({ type: 'error', msg: `Erreur lors de la publication de « ${denomination} ».` });
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl mb-1">Entités à publier</h1>
          <p className="text-sm text-gray-600">
            Dossiers conformes ou validés mais pas encore publiés sur la carte publique.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`alert mb-4 flex items-start gap-2 ${
            feedback.type === 'success' ? 'alert-success' : 'alert-danger'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="text-sm">{feedback.msg}</span>
        </div>
      )}

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Rechercher une entité..."
        />
        <div className="form-group mb-0">
          <select
            value={statutFiltre}
            onChange={(e) => { setStatutFiltre(e.target.value); setPage(1); }}
            className="w-full py-2.5"
          >
            <option value="">Tous statuts publiables</option>
            <option value="conforme_sous_reserve">Partiellement conforme</option>
            <option value="valide">Validé</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <Loading fullPage text="Chargement..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune entité à publier"
          description="Tous les dossiers conformes ont déjà été publiés sur la carte publique."
        />
      ) : (
        <>
          <div className="table-container overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Dénomination</th>
                  <th>N° CC</th>
                  <th>Secteur</th>
                  <th>Ville</th>
                  <th>Statut workflow</th>
                  <th>Score</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((entite) => (
                  <tr key={entite.id}>
                    <td className="font-semibold">{entite.denomination}</td>
                    <td className="text-sm">{entite.numero_cc}</td>
                    <td className="text-sm">{entite.secteur_activite ?? '-'}</td>
                    <td className="text-sm">{entite.ville ?? '-'}</td>
                    <td className="text-xs">
                      <span className="badge badge-achevee">{entite.statut_workflow ?? '-'}</span>
                    </td>
                    <td className="text-sm font-mono">
                      {typeof entite.score_conformite === 'number'
                        ? `${entite.score_conformite}/100`
                        : '-'}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to={`/admin/entites/${entite.id}`}
                          className="text-[var(--brand-secondary)] hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm">Voir</span>
                        </Link>
                        <button
                          onClick={() => handlePublier(entite.id, entite.denomination)}
                          disabled={publishingId === entite.id}
                          className="btn btn-primary text-xs flex items-center gap-1 px-3 py-1"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          {publishingId === entite.id ? 'Publication...' : 'Publier'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && (
            <Pagination
              page={data.page}
              totalPages={data.pages}
              hasNext={data.has_next}
              hasPrev={data.has_prev}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
