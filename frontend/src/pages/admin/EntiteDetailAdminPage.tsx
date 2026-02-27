import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, Users, MapPin, Edit } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import StatusBadge from '@/components/common/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { hasMinRole } from '@/components/admin/AdminSidebar';
import { ROUTES } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import type { StatutConformite } from '@/types/enums';

function InfoRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  const display = typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : (value ?? '-');
  return (
    <div className="flex flex-col sm:flex-row gap-1">
      <span className="text-sm font-semibold text-gray-600 sm:w-48 flex-shrink-0">{label}</span>
      <span className="text-sm">{String(display)}</span>
    </div>
  );
}

export default function EntiteDetailAdminPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canEdit = user && hasMinRole(user.role, 'editor');

  const { data: entite, isLoading, error } = useApi(
    () => adminApi.getEntiteDetail(id!),
    [id]
  );

  if (isLoading) return <Loading fullPage text="Chargement de l'entité..." />;

  if (error || !entite) {
    return (
      <div>
        <Link to={ROUTES.ADMIN_ENTITES} className="flex items-center gap-2 text-[var(--artci-green)] mb-4 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </Link>
        <ErrorDisplay message={error ?? 'Entité non trouvée.'} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link to={ROUTES.ADMIN_ENTITES} className="flex items-center gap-2 text-[var(--artci-green)] hover:underline text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </Link>
        {canEdit && (
          <Link
            to={`/admin/entites/${entite.id}`}
            className="btn btn-outline text-sm py-2 px-4 flex items-center gap-2 no-underline"
          >
            <Edit className="w-4 h-4" /> Modifier
          </Link>
        )}
      </div>

      {/* En-tête */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl mb-1">{entite.denomination}</h1>
            <p className="text-gray-500 text-sm">N° CC : {entite.numero_cc}</p>
            {entite.origine_saisie && (
              <span className="badge badge-encours text-xs mt-2">{entite.origine_saisie}</span>
            )}
          </div>
          {entite.conformite?.statut_conformite && (
            <StatusBadge statut={entite.conformite.statut_conformite as StatutConformite} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identification */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--artci-orange)]" /> Identification
          </h3>
          <div className="space-y-3">
            <InfoRow label="Dénomination" value={entite.denomination} />
            <InfoRow label="N° CC" value={entite.numero_cc} />
            <InfoRow label="Forme juridique" value={entite.forme_juridique} />
            <InfoRow label="Secteur d'activité" value={entite.secteur_activite} />
            <InfoRow label="Adresse" value={entite.adresse} />
            <InfoRow label="Ville" value={entite.ville} />
            <InfoRow label="Région" value={entite.region} />
            <InfoRow label="Téléphone" value={entite.telephone} />
            <InfoRow label="Email" value={entite.email} />
          </div>
        </div>

        {/* Workflow */}
        {entite.workflow && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--artci-green)]" /> Workflow
            </h3>
            <div className="space-y-3">
              <InfoRow label="Statut" value={entite.workflow.statut} />
              <InfoRow label="N° Autorisation" value={entite.workflow.numero_autorisation_artci} />
              <InfoRow label="Date soumission" value={entite.workflow.date_soumission ? formatDate(entite.workflow.date_soumission) : '-'} />
              <InfoRow label="Date validation" value={entite.workflow.date_validation ? formatDate(entite.workflow.date_validation) : '-'} />
              <InfoRow label="Date publication" value={entite.workflow.date_publication ? formatDate(entite.workflow.date_publication) : '-'} />
              {entite.workflow.motif_rejet && (
                <div className="alert alert-danger mt-2">
                  <strong>Motif de rejet :</strong> {entite.workflow.motif_rejet}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact */}
        {entite.contact && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--artci-orange)]" /> Contact
            </h3>
            <div className="space-y-3">
              <InfoRow label="Responsable légal" value={entite.contact.responsable_legal_nom} />
              <InfoRow label="Fonction" value={entite.contact.responsable_legal_fonction} />
              <InfoRow label="Email" value={entite.contact.responsable_legal_email} />
              <InfoRow label="Téléphone" value={entite.contact.responsable_legal_telephone} />
              <InfoRow label="Site web" value={entite.contact.site_web} />
            </div>
          </div>
        )}

        {/* Localisation */}
        {entite.localisation && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[var(--artci-orange)]" /> Localisation
            </h3>
            <div className="space-y-3">
              <InfoRow label="Latitude" value={entite.localisation.latitude} />
              <InfoRow label="Longitude" value={entite.localisation.longitude} />
              <InfoRow label="Adresse complète" value={entite.localisation.adresse_complete} />
            </div>
          </div>
        )}

        {/* Conformité */}
        {entite.conformite && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--artci-green)]" /> Conformité
            </h3>
            <div className="space-y-3">
              <InfoRow label="Score" value={entite.conformite.score_conformite != null ? `${entite.conformite.score_conformite}%` : '-'} />
              <InfoRow label="A un DPO" value={entite.conformite.a_dpo} />
              <InfoRow label="Type DPO" value={entite.conformite.type_dpo} />
              <InfoRow label="Effectif" value={entite.conformite.effectif_entreprise} />
            </div>
          </div>
        )}

        {/* Finalités */}
        {entite.finalites && entite.finalites.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Finalités de traitement</h3>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr><th>Finalité</th><th>Base légale</th><th>%</th></tr>
                </thead>
                <tbody>
                  {entite.finalites.map((f, i) => (
                    <tr key={f.id ?? i}>
                      <td className="text-sm">{f.finalite}</td>
                      <td className="text-sm">{f.base_legale}</td>
                      <td className="text-sm">{f.pourcentage ?? '-'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
