/**
 * Page "Mes documents" cote entreprise.
 *
 * Liste TOUS les fichiers que l'entreprise a deposes depuis son compte :
 * - Documents d'inscription (RCCM, DFE) — telechargement via URL R2 signee
 * - Documents joints de son enregistrement (rapports, audits, autorisations…)
 *
 * Specification utilisateur (E3) :
 *   « tous les documents uploadé dans mon enregistrement, sont stockés dans
 *     cette partie, il pourra télécharger à souhait. c'est lié au formulaire »
 */
import { useCallback, useState } from 'react';
import { FileText, Download, Folder, ClipboardCheck } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as entrepriseApi from '@/api/entreprise.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/format';

// Libelles humains pour les types de documents (codes stockes en DB).
const TYPE_LABELS: Record<string, string> = {
  // Inscription
  doc_rccm: 'RCCM (Registre du Commerce et du Crédit Mobilier)',
  doc_dfe: "DFE (Déclaration Fiscale d'Existence)",
  doc_autre: 'Autre document administratif',
  // Documents joints
  autorisation: "Autorisation ARTCI",
  rapport_activite: "Rapport d'activité",
  rapport_audit: "Rapport d'audit",
  registre_commerce: 'Registre du commerce',
  statuts: 'Statuts',
  attestation_fiscale: 'Attestation fiscale',
  cni: "Carte Nationale d'Identité",
  dpo_cv: 'CV du DPO',
  dpo_casier_judiciaire: 'Casier judiciaire DPO',
  dpo_cni: 'CNI du DPO',
  dpo_extrait_naissance: 'Extrait de naissance DPO',
  // Documents du formulaire DCP (uploads R2)
  courrier_habilitation_dpo: "Courrier d'habilitation DPO (ARTCI)",
  charte_protection: 'Charte de protection des données',
  registre_violations: 'Registre des violations de données',
  procedure_violation: 'Procédure de réaction aux violations',
  autorisation_transfert: 'Autorisation de transfert hors CEDEAO',
  autre: 'Autre',
};

function labelType(type: string | undefined): string {
  if (!type) return 'Document';
  return TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
}

function formatTaille(taille: number | undefined): string {
  if (!taille) return '';
  if (taille < 1024) return `${taille} o`;
  if (taille < 1024 * 1024) return `${Math.round(taille / 1024)} Ko`;
  return `${(taille / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function MesDocumentsPage() {
  const fetcher = useCallback(() => entrepriseApi.getMesDocuments(), []);
  const { data, isLoading, error, refetch } = useApi(fetcher, []);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (isLoading) return <Loading fullPage text="Chargement de vos documents…" />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  const docs = data ?? [];
  const inscriptionDocs = docs.filter((d) => d.source === 'inscription');
  const enregistrementDocs = docs.filter((d) => d.source === 'enregistrement');

  if (docs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl mb-6 flex items-center gap-3">
          <Folder className="w-7 h-7 text-[var(--brand-primary)]" />
          Mes documents
        </h1>
        <EmptyState
          title="Aucun document"
          description="Vous n'avez pas encore déposé de documents. Ils apparaîtront ici dès que vous en aurez uploadé via l'inscription ou votre enregistrement."
        />
      </div>
    );
  }

  async function handleDownload(doc: entrepriseApi.MesDocumentItem) {
    if (!doc.download_url) return;
    setDownloadingId(doc.id);
    try {
      window.open(doc.download_url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloadingId(null);
    }
  }

  function renderCard(doc: entrepriseApi.MesDocumentItem) {
    return (
      <div key={doc.id} className="border border-gray-200 rounded-lg p-4 flex items-start gap-3 bg-white">
        <FileText className="w-6 h-6 text-[var(--brand-primary)] flex-shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{labelType(doc.type_document)}</p>
          <p className="text-xs text-gray-500 truncate">{doc.nom_fichier || '—'}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-gray-400">
            {doc.taille && <span>{formatTaille(doc.taille)}</span>}
            {doc.mime_type && <span>• {doc.mime_type}</span>}
            {doc.uploadedAt && <span>• déposé le {formatDateTime(doc.uploadedAt)}</span>}
          </div>
        </div>
        <div className="flex-shrink-0">
          {doc.download_url ? (
            <button
              type="button"
              onClick={() => handleDownload(doc)}
              disabled={downloadingId === doc.id}
              className="btn btn-outline text-xs py-1.5 px-3 flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Télécharger
            </button>
          ) : (
            <span className="text-[11px] text-gray-400 italic">indisponible</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <Folder className="w-7 h-7 text-[var(--brand-primary)]" />
        Mes documents
      </h1>

      <p className="text-sm text-gray-500 mb-6">
        Tous les documents que vous avez déposés sont listés ici. Vous pouvez les
        télécharger à tout moment.
      </p>

      {inscriptionDocs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-3 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[var(--brand-secondary)]" />
            Documents d'inscription ({inscriptionDocs.length})
          </h2>
          <div className="space-y-2">
            {inscriptionDocs.map(renderCard)}
          </div>
        </section>
      )}

      {enregistrementDocs.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
            Documents de mon enregistrement ({enregistrementDocs.length})
          </h2>
          <div className="space-y-2">
            {enregistrementDocs.map(renderCard)}
          </div>
        </section>
      )}
    </div>
  );
}
