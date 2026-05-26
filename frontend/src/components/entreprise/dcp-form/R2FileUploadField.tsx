/**
 * Champ d'upload reutilisable qui pousse le fichier DIRECTEMENT vers Cloudflare R2
 * (via une URL pre-signee) et expose la cle R2 a l'appelant.
 *
 * Avantages vs <input type="file"> brut :
 * - Le fichier est reellement stocke (pas juste un boolean)
 * - L'utilisateur voit nom du fichier + bouton "Voir" quand uploade
 * - Possibilite de remplacer ou supprimer
 * - Pas de re-upload necessaire en cas de save / reload (la cle reste)
 *
 * Cf. specs B25 (charte), B27 (registre violations), B28 (procedure violation),
 * et le courrier d'habilitation DPO + autorisation transfert.
 */
import { useState } from 'react';
import { Upload, FileText, X, Download } from 'lucide-react';
import { uploadToR2 } from '@/api/uploads.api';

interface Props {
  /** Cle R2 actuelle (si fichier deja uploade). null/undefined = pas d'upload. */
  r2Key?: string | null;
  /** Nom de fichier humain (affiche). */
  filename?: string | null;
  /** URL de telechargement R2 signee (fournie par le backend en mode view/treat). */
  downloadUrl?: string | null;
  /** Dossier R2 logique : 'inscriptions' | 'documents' | 'autorisations' | 'avatars'. */
  folder?: 'inscriptions' | 'documents' | 'autorisations' | 'avatars';
  /** Callback quand l'upload R2 reussit. */
  onUploaded: (data: { r2_key: string; filename: string; size: number; mime_type: string }) => void;
  /** Callback quand l'utilisateur supprime le fichier upload. */
  onRemove?: () => void;
  /** Libelle au-dessus du champ. */
  label: string;
  /** Taille max en Mo (defaut 5). */
  maxSizeMo?: number;
  /** Mime types acceptes (defaut PDF). */
  accept?: string;
  /** Champ obligatoire ? */
  required?: boolean;
  /** Champ desactive (mode view/treat). */
  disabled?: boolean;
}

export default function R2FileUploadField({
  r2Key,
  filename,
  downloadUrl,
  folder = 'documents',
  onUploaded,
  onRemove,
  label,
  maxSizeMo = 5,
  accept = 'application/pdf',
  required = false,
  disabled = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset pour permettre de re-selectionner le meme fichier

    // Validations cote client
    if (file.size > maxSizeMo * 1024 * 1024) {
      setError(`Le fichier dépasse ${maxSizeMo} Mo.`);
      return;
    }
    if (accept && !accept.split(',').map((s) => s.trim()).some((m) => m === file.type || (m.endsWith('/*') && file.type.startsWith(m.replace('/*', '/'))))) {
      setError(`Type de fichier non autorisé. Attendu : ${accept}.`);
      return;
    }

    setError('');
    setUploading(true);
    try {
      const result = await uploadToR2(folder, file);
      onUploaded({
        r2_key: result.key,
        filename: result.filename,
        size: result.size,
        mime_type: result.mime_type,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload échoué.';
      setError(`Erreur lors de l'upload : ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  const hasFile = Boolean(r2Key);

  return (
    <div className="mb-3">
      <label className="text-xs font-semibold block mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {hasFile && (
        <div className="flex items-center justify-between gap-2 border border-green-200 bg-green-50 rounded p-2 mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="w-4 h-4 text-green-700 flex-shrink-0" />
            <span className="text-xs truncate">{filename ?? r2Key}</span>
            <span className="text-[10px] text-green-700 font-semibold">✓ uploadé</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--artci-green)] hover:text-green-800 flex items-center gap-1 text-xs"
                title="Télécharger le document"
              >
                <Download className="w-3 h-3" /> Voir
              </a>
            )}
            {!disabled && onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="text-red-500 hover:text-red-700"
                title="Retirer le fichier"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {!disabled && (
        <label className={`flex items-center gap-2 border border-dashed border-gray-300 rounded p-2 cursor-pointer text-xs hover:bg-gray-50 ${uploading ? 'opacity-60' : ''}`}>
          {uploading ? (
            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          ) : (
            <Upload className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-gray-600">
            {uploading ? "Upload en cours…" : hasFile ? "Remplacer le fichier" : `Choisir un fichier (max ${maxSizeMo} Mo)`}
          </span>
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {!disabled && !hasFile && (
        <p className="text-[10px] text-gray-400 mt-0.5">
          Format accepté : {accept === 'application/pdf' ? 'PDF uniquement' : accept}
        </p>
      )}
    </div>
  );
}

// Re-export l'icone Download pour usage externe si besoin de telechargement signe.
export { Download };
