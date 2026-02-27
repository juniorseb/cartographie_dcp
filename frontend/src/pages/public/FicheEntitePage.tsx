import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Shield, Users, FileText } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as publicApi from '@/api/public.api';
import StatusBadge from '@/components/common/StatusBadge';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';

export default function FicheEntitePage() {
  const { id } = useParams<{ id: string }>();

  const { data: entite, isLoading, error } = useApi(
    () => publicApi.getEntiteDetail(id!),
    [id]
  );

  if (isLoading) return <Loading fullPage text="Chargement de la fiche..." />;

  if (error || !entite) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link to="/entites" className="flex items-center gap-2 text-[var(--artci-orange)] mb-4 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </Link>
        <ErrorDisplay message={error ?? 'Entité non trouvée ou non conforme.'} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Navigation */}
      <Link to="/entites" className="flex items-center gap-2 text-[var(--artci-orange)] mb-6 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Retour à la liste
      </Link>

      {/* En-tête */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl mb-1">{entite.denomination}</h1>
            <p className="text-gray-500">N° CC : {entite.numero_cc}</p>
          </div>
          <StatusBadge statut={entite.statut_conformite} />
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

        {/* Localisation + Conformité */}
        <div className="space-y-6">
          {/* Localisation */}
          {(entite.latitude || entite.longitude) && (
            <div className="card">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[var(--artci-orange)]" />
                Localisation
              </h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-semibold">Latitude :</span> {entite.latitude}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Longitude :</span> {entite.longitude}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${entite.latitude},${entite.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[var(--artci-orange)] hover:underline mt-2"
                >
                  <MapPin className="w-4 h-4" />
                  Voir sur Google Maps
                </a>
              </div>
            </div>
          )}

          {/* Conformité */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--artci-green)]" />
              Conformité
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-semibold">Statut :</span>{' '}
                <StatusBadge statut={entite.statut_conformite} />
              </div>
              {entite.score_conformite != null && (
                <div>
                  <span className="text-sm font-semibold">Score :</span>
                  <div className="progress mt-1">
                    <div
                      className="progress-bar"
                      style={{ width: `${entite.score_conformite}%` }}
                    >
                      {entite.score_conformite}%
                    </div>
                  </div>
                </div>
              )}
              <InfoRow label="CPD (DPO)" value={entite.a_dpo ? 'Oui' : 'Non'} />
            </div>
          </div>
        </div>

        {/* Contact */}
        {entite.contact && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--artci-orange)]" />
              Contact
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

        {/* Finalités */}
        {entite.finalites && entite.finalites.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Finalités de traitement</h3>
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
                  {entite.finalites.map((f) => (
                    <tr key={f.id}>
                      <td className="text-sm">{f.finalite}</td>
                      <td className="text-sm">{f.base_legale}</td>
                      <td>
                        {f.pourcentage != null && (
                          <div className="flex items-center gap-2">
                            <div className="progress w-16 h-2">
                              <div
                                className="progress-bar h-2"
                                style={{ width: `${f.pourcentage}%` }}
                              />
                            </div>
                            <span className="text-xs">{f.pourcentage}%</span>
                          </div>
                        )}
                      </td>
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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1">
      <span className="text-sm font-semibold text-gray-600 sm:w-40 flex-shrink-0">{label}</span>
      <span className="text-sm">{value ?? '-'}</span>
    </div>
  );
}
