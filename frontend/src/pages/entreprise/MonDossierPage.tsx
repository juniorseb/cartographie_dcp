import { ArrowLeft, FileText, MapPin, Shield, Users, Lock, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import StatusBadge from '@/components/common/StatusBadge';
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

export default function MonDossierPage() {
  const { data: dossier, isLoading, error, refetch } = useApi(
    () => entrepriseApi.getMonDossier(),
    []
  );

  if (isLoading) return <Loading fullPage text="Chargement du dossier..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!dossier) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-10">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Aucun dossier trouvé.</p>
          <Link to={ROUTES.ENTREPRISE_DEMANDE} className="btn btn-primary">
            Créer une demande
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link to={ROUTES.ENTREPRISE_DASHBOARD} className="flex items-center gap-2 text-[var(--artci-orange)] mb-4 hover:underline text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour au dashboard
      </Link>

      {/* En-tête */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl mb-1">{dossier.denomination}</h1>
            <p className="text-gray-500 text-sm">N° CC : {dossier.numero_cc}</p>
          </div>
          {dossier.conformite?.statut_conformite && (
            <StatusBadge statut={dossier.conformite.statut_conformite as StatutConformite} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identification */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--artci-orange)]" />
            Identification
          </h3>
          <div className="space-y-3">
            <InfoRow label="Dénomination" value={dossier.denomination} />
            <InfoRow label="N° CC" value={dossier.numero_cc} />
            <InfoRow label="Forme juridique" value={dossier.forme_juridique} />
            <InfoRow label="Secteur d'activité" value={dossier.secteur_activite} />
            <InfoRow label="Adresse" value={dossier.adresse} />
            <InfoRow label="Ville" value={dossier.ville} />
            <InfoRow label="Région" value={dossier.region} />
            <InfoRow label="Téléphone" value={dossier.telephone} />
            <InfoRow label="Email" value={dossier.email} />
          </div>
        </div>

        {/* Workflow */}
        {dossier.workflow && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--artci-green)]" />
              Workflow
            </h3>
            <div className="space-y-3">
              <InfoRow label="Statut" value={dossier.workflow.statut} />
              <InfoRow label="N° Autorisation" value={dossier.workflow.numero_autorisation_artci} />
              <InfoRow label="Date soumission" value={dossier.workflow.date_soumission ? formatDate(dossier.workflow.date_soumission) : '-'} />
              <InfoRow label="Date validation" value={dossier.workflow.date_validation ? formatDate(dossier.workflow.date_validation) : '-'} />
              {dossier.workflow.motif_rejet && (
                <div className="alert alert-danger mt-2">
                  <strong>Motif de rejet :</strong> {dossier.workflow.motif_rejet}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact */}
        {dossier.contact && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--artci-orange)]" />
              Contact
            </h3>
            <div className="space-y-3">
              <InfoRow label="Responsable légal" value={dossier.contact.responsable_legal_nom} />
              <InfoRow label="Fonction" value={dossier.contact.responsable_legal_fonction} />
              <InfoRow label="Email" value={dossier.contact.responsable_legal_email} />
              <InfoRow label="Téléphone" value={dossier.contact.responsable_legal_telephone} />
              <InfoRow label="Site web" value={dossier.contact.site_web} />
            </div>
          </div>
        )}

        {/* Localisation */}
        {dossier.localisation && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[var(--artci-orange)]" />
              Localisation
            </h3>
            <div className="space-y-3">
              <InfoRow label="Latitude" value={dossier.localisation.latitude} />
              <InfoRow label="Longitude" value={dossier.localisation.longitude} />
              <InfoRow label="Adresse complète" value={dossier.localisation.adresse_complete} />
            </div>
          </div>
        )}

        {/* DPOs */}
        {dossier.dpos && dossier.dpos.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[var(--artci-green)]" />
              DPO / CPD
            </h3>
            {dossier.dpos.map((dpo, i) => (
              <div key={dpo.id ?? i} className="mb-3 p-3 bg-gray-50 rounded">
                <InfoRow label="Nom" value={`${dpo.nom} ${dpo.prenom ?? ''}`} />
                <InfoRow label="Type" value={dpo.type} />
                <InfoRow label="Email" value={dpo.email} />
                <InfoRow label="Organisme" value={dpo.organisme} />
              </div>
            ))}
          </div>
        )}

        {/* Finalités */}
        {dossier.finalites && dossier.finalites.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[var(--artci-orange)]" />
              Finalités de traitement
            </h3>
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Finalité</th>
                    <th>Base légale</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {dossier.finalites.map((f, i) => (
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
