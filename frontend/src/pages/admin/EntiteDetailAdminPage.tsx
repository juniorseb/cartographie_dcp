/**
 * Detail d'une entite (vue admin/editeur, lecture seule).
 *
 * Affiche le formulaire DCP EXACTEMENT comme l'entreprise l'a renseigne
 * (meme stepper, memes sections, memes champs), via `<MonEnregistrementPage
 * mode="view" />`. C'est la specification fournie par l'utilisateur :
 *
 *   « quand l'admin ou l'editeur clique sur voir, dans son panier... on veut
 *     que ca affiche exactement comme le formulaire que l'entreprise a
 *     renseigne, avec stepper etc. sans rien changer. »
 *
 * Les boutons "Modifier" et "Retourner a l'entreprise" sont retires de cette
 * page (cf. specs H5 et H6) — la modification n'est pas la responsabilite
 * de l'admin, et le retour se fait depuis Mon Panier de l'editeur.
 *
 * Les actions ADMIN restantes (publier sur la carte, deposer un rapport
 * d'audit) sont affichees dans un header au-dessus du formulaire.
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Upload } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import StatusBadge from '@/components/common/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { hasMinRole } from '@/components/admin/AdminSidebar';
import { ROUTES, STATUT_CONFORMITE_LABELS } from '@/utils/constants';
import type { StatutConformite } from '@/types/enums';
import MonEnregistrementPage from '@/pages/entreprise/MonEnregistrementPage';


export default function EntiteDetailAdminPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canPublish = user && hasMinRole(user.role, 'admin');

  // Detail leger pour afficher le header (titre, statut, boutons d'action).
  // Le formulaire complet est rendu par MonEnregistrementPage en mode 'view'.
  const { data: entite, isLoading, error, refetch } = useApi(
    () => adminApi.getEntiteDetail(id!),
    [id],
  );

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [uploadingAudit, setUploadingAudit] = useState(false);
  const [uploadAuditError, setUploadAuditError] = useState('');

  async function handlePublier() {
    if (!id) return;
    if (!window.confirm("Publier cette entite sur la cartographie publique ?")) return;
    setPublishError('');
    setPublishing(true);
    try {
      await adminApi.publierEntite(id);
      refetch();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; message?: string } } };
      setPublishError(err?.response?.data?.error || err?.response?.data?.message || 'Erreur lors de la publication.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleDepublier() {
    if (!id) return;
    if (!window.confirm("Retirer cette entite de la cartographie publique ?")) return;
    try {
      await adminApi.depublierEntite(id);
      refetch();
    } catch {
      window.alert("Erreur lors du retrait.");
    }
  }

  async function handleUploadAudit(file: File) {
    if (!id) return;
    setUploadAuditError('');
    setUploadingAudit(true);
    try {
      await adminApi.uploadRapportAudit(id, file);
      refetch();
    } catch {
      setUploadAuditError("Erreur lors du televersement du rapport.");
    } finally {
      setUploadingAudit(false);
    }
  }

  if (isLoading) return <Loading fullPage text="Chargement de l'entite..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!entite) return <ErrorDisplay message="Entite introuvable." />;

  // Spec H3 : la publication n'est proposee que si l'entite est Conforme
  // ou Partiellement conforme.
  const statutConf = entite.conformite?.statut_conformite as StatutConformite | undefined;
  const peutPublier = statutConf === 'Conforme' || statutConf === 'Partiellement conforme';
  const estPubliee = Boolean(entite.publie_sur_carte);

  return (
    <div>
      {/* Header minimal : retour + titre + statut + actions admin */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate(ROUTES.ADMIN_ENTITES)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-[var(--artci-orange)]"
            >
              <ArrowLeft className="w-4 h-4" /> Retour aux entites
            </button>

            {canPublish && (
              <div className="flex items-center gap-2">
                {peutPublier && !estPubliee && (
                  <button
                    onClick={handlePublier}
                    disabled={publishing}
                    className="btn btn-primary text-sm py-2 px-4 flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4" /> Publier sur la carte
                  </button>
                )}
                {estPubliee && (
                  <button
                    onClick={handleDepublier}
                    className="btn btn-outline text-sm py-2 px-4 flex items-center gap-2"
                  >
                    Retirer de la carte
                  </button>
                )}
                <label className="btn btn-outline text-sm py-2 px-4 flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {uploadingAudit ? 'Televersement…' : "Rapport d'audit"}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUploadAudit(e.target.files[0])}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl">{entite.denomination}</h1>
              <p className="text-xs text-gray-500">N° CC {entite.numero_cc}</p>
            </div>
            <div className="flex items-center gap-2">
              {statutConf && <StatusBadge statut={statutConf} />}
              {estPubliee && (
                <span className="badge badge-conforme text-xs">Publiee</span>
              )}
              {!estPubliee && (
                <span className="badge badge-encours text-xs">Non publiee</span>
              )}
            </div>
          </div>

          {publishError && <div className="alert alert-danger text-sm">{publishError}</div>}
          {uploadAuditError && <div className="alert alert-danger text-sm">{uploadAuditError}</div>}
        </div>
      </div>

      {/* Formulaire DCP tel que l'entreprise l'a renseigne — lecture pure */}
      <MonEnregistrementPage mode="view" entiteId={id} />
    </div>
  );
}

// Note: les helpers InfoRow / SectionCard / RecapView de l'ancienne version
// sont remplaces par le rendu standard de MonEnregistrementPage. La constante
// STATUT_CONFORMITE_LABELS reste accessible si besoin via @/utils/constants.
// Si vous avez besoin de l'ancienne RecapView ailleurs, importez-la depuis
// MonEnregistrementPage (elle y est exportee).
export { STATUT_CONFORMITE_LABELS };
