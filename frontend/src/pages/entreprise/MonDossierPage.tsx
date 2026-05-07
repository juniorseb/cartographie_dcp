import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, FileText, MapPin, Shield, Users, Lock, Globe,
  FolderOpen, FileCheck, Clock, Upload, CheckCircle, XCircle,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { ROUTES } from '@/utils/constants';
import { formatDate, formatDateTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { StatutConformite } from '@/types/enums';
import type { DossierComplet } from '@/types/entreprise';
import type { DPODocType, DocumentJointItem } from '@/api/entreprise.api';

type Tab = 'identite' | 'rapports' | 'journal' | 'dpo';

const TAB_LABELS: Record<Tab, string> = {
  identite: 'Mon identité',
  rapports: 'Mes Rapports',
  journal: "Journal d'événements",
  dpo: 'Dossier DPO',
};

const TAB_ICONS: Record<Tab, typeof FileText> = {
  identite: FileText,
  rapports: FileCheck,
  journal: Clock,
  dpo: Lock,
};

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
  const [tab, setTab] = useState<Tab>('identite');
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
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Aucun dossier trouvé.</p>
          <Link to={ROUTES.ENTREPRISE_ENREGISTREMENT} className="btn btn-primary">
            Créer un enregistrement
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Link to={ROUTES.ENTREPRISE_DASHBOARD} className="flex items-center gap-2 text-[var(--artci-orange)] mb-4 hover:underline text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
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

      {/* Onglets sous-dossiers */}
      <div className="card">
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          {(Object.keys(TAB_LABELS) as Tab[]).map((key) => {
            const Icon = TAB_ICONS[key];
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                  active
                    ? 'border-[var(--artci-orange)] text-[var(--artci-orange)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {TAB_LABELS[key]}
              </button>
            );
          })}
        </div>

        {tab === 'identite' && <IdentiteTab dossier={dossier} />}
        {tab === 'rapports' && <RapportsTab />}
        {tab === 'journal' && <JournalTab />}
        {tab === 'dpo' && <DPOTab />}
      </div>
    </div>
  );
}

function IdentiteTab({ dossier }: { dossier: DossierComplet }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Identification */}
      <div>
        <h3 className="text-base font-bold mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--artci-orange)]" />
          Identification
        </h3>
        <div className="space-y-2">
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
        <div>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--artci-green)]" />
            Workflow
          </h3>
          <div className="space-y-2">
            <InfoRow label="Statut" value={dossier.workflow.statut} />
            <InfoRow label="N° Autorisation" value={dossier.workflow.numero_autorisation_artci} />
            <InfoRow label="Date soumission" value={dossier.workflow.date_soumission ? formatDate(dossier.workflow.date_soumission) : '-'} />
            <InfoRow label="Date validation" value={dossier.workflow.date_validation ? formatDate(dossier.workflow.date_validation) : '-'} />
            {dossier.workflow.motif_rejet && (
              <div className="alert alert-danger mt-2 text-sm">
                <strong>Motif de rejet :</strong> {dossier.workflow.motif_rejet}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact */}
      {dossier.contact && (
        <div>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--artci-orange)]" />
            Contact
          </h3>
          <div className="space-y-2">
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
        <div>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--artci-orange)]" />
            Localisation
          </h3>
          <div className="space-y-2">
            <InfoRow label="Latitude" value={dossier.localisation.latitude} />
            <InfoRow label="Longitude" value={dossier.localisation.longitude} />
            <InfoRow label="Adresse complète" value={dossier.localisation.adresse_complete} />
          </div>
        </div>
      )}

      {/* DPOs */}
      {dossier.dpos && dossier.dpos.length > 0 && (
        <div>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[var(--artci-green)]" />
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
        <div className="lg:col-span-2">
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[var(--artci-orange)]" />
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
  );
}

const TYPE_DOC_LABELS: Record<string, string> = {
  rapport_activite: "Rapport d'activité",
  rapport_audit: "Rapport d'audit",
};

function RapportsTab() {
  const { data: rapports, isLoading, error, refetch } = useApi(
    () => entrepriseApi.getMesRapports(),
    []
  );

  if (isLoading) return <Loading text="Chargement..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!rapports || rapports.length === 0) {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-4">
          Vos rapports d'activité (que vous soumettez) et rapports d'audit (déposés par l'ARTCI)
          apparaîtront ici.
        </p>
        <EmptyState title="Aucun rapport" description="Aucun rapport n'a encore été déposé." />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Vos rapports d'activité et les rapports d'audit déposés par l'ARTCI.
      </p>
      <div className="space-y-3">
        {rapports.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <FileCheck className="w-5 h-5 text-[var(--artci-green)] flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{r.nom_fichier}</div>
                <div className="text-xs text-gray-500">
                  {TYPE_DOC_LABELS[r.type_document] ?? r.type_document}
                  {r.uploadedAt && ` • ${formatDateTime(r.uploadedAt)}`}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUT_BADGE: Record<string, string> = {
  conforme: 'badge-conforme',
  conforme_sous_reserve: 'badge-achevee',
  publie: 'badge-conforme',
  valide: 'badge-conforme',
  rejete: 'badge-encours',
  en_verification: 'badge-achevee',
  en_attente_complements: 'badge-encours',
  soumis: 'badge-achevee',
  brouillon: 'badge-encours',
  brouillon_artci: 'badge-encours',
};

function JournalTab() {
  const { data: events, isLoading, error, refetch } = useApi(
    () => entrepriseApi.getJournalEvenements(),
    []
  );

  if (isLoading) return <Loading text="Chargement..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;
  if (!events || events.length === 0) {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-4">
          Suivi détaillé de l'évolution de votre dossier de recensement.
        </p>
        <EmptyState title="Aucun événement" description="L'historique des changements de votre dossier apparaîtra ici." />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Suivi détaillé de l'évolution de votre dossier de recensement.
      </p>
      <div className="space-y-3">
        {events.map((e) => {
          const cls = e.nouveau_statut ? STATUT_BADGE[e.nouveau_statut] ?? 'badge-encours' : 'badge-encours';
          return (
            <div key={e.id} className="border-l-4 border-[var(--artci-orange)] pl-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {e.ancien_statut && (
                    <>
                      <span className="text-xs text-gray-500">{e.ancien_statut}</span>
                      <span className="text-xs">→</span>
                    </>
                  )}
                  <span className={`badge ${cls} text-xs`}>{e.nouveau_statut}</span>
                </div>
                <span className="text-xs text-gray-400">{e.date ? formatDateTime(e.date) : ''}</span>
              </div>
              {e.commentaire && <p className="text-sm text-gray-700 mt-1">{e.commentaire}</p>}
              {e.modifie_par_nom && (
                <p className="text-xs text-gray-400 mt-1">— {e.modifie_par_nom}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DPO_DOCS: { type: DPODocType; label: string; description: string }[] = [
  { type: 'dpo_cv', label: 'CV', description: 'Curriculum Vitae du DPO' },
  { type: 'dpo_casier_judiciaire', label: 'Casier judiciaire', description: 'Extrait du casier judiciaire' },
  { type: 'dpo_cni', label: 'CNI', description: "Carte nationale d'identité" },
  { type: 'dpo_extrait_naissance', label: 'Extrait de naissance', description: 'Extrait d\'acte de naissance' },
];

function DPOTab() {
  const { data: docs, isLoading, error, refetch } = useApi(
    () => entrepriseApi.getDossierDPO(),
    []
  );
  const [uploadingType, setUploadingType] = useState<DPODocType | null>(null);
  const [uploadError, setUploadError] = useState('');

  async function handleUpload(type: DPODocType, file: File) {
    setUploadError('');
    setUploadingType(type);
    try {
      await entrepriseApi.uploadDocumentDPO(file, type);
      refetch();
    } catch {
      setUploadError(`Erreur lors de l'upload du document ${type}.`);
    } finally {
      setUploadingType(null);
    }
  }

  if (isLoading) return <Loading text="Chargement..." />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  const docsByType: Record<string, DocumentJointItem | undefined> = {};
  (docs ?? []).forEach((d) => {
    docsByType[d.type_document] = d;
  });

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Le DPO doit téléverser ces 4 documents qui seront utilisés par l'ARTCI dans le cadre
        de la validation de votre dossier.
      </p>
      {uploadError && <div className="alert alert-danger mb-4 text-sm">{uploadError}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DPO_DOCS.map(({ type, label, description }) => {
          const doc = docsByType[type];
          const uploading = uploadingType === type;
          return (
            <div key={type} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-sm">{label}</h4>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                {doc ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                )}
              </div>
              {doc ? (
                <div className="text-xs text-gray-500 mb-2 truncate">
                  {doc.nom_fichier}
                  {doc.uploadedAt && ` • ${formatDate(doc.uploadedAt)}`}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic mb-2">Aucun document déposé</div>
              )}
              <label className="btn btn-secondary text-sm py-2 px-3 w-full flex items-center justify-center gap-2 cursor-pointer">
                {uploading ? (
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {doc ? 'Remplacer' : 'Téléverser'}
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(type, f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
