import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import * as entrepriseApi from '@/api/entreprise.api';

export default function RapportsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [typeDocument, setTypeDocument] = useState('rapport_activite');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setSuccess('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier.');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      const result = await entrepriseApi.soumettreRapport(selectedFile, typeDocument);
      setSuccess(`Rapport "${result.nom_fichier}" soumis avec succès.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      setError('Erreur lors de l\'envoi du rapport.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6">Rapports d'activité</h1>

      <div className="card card-orange">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[var(--artci-orange)]" />
          Soumettre un rapport
        </h3>

        {error && <div className="alert alert-danger mb-4">{error}</div>}
        {success && (
          <div className="alert alert-success mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="type_doc">Type de document</label>
            <select
              id="type_doc"
              value={typeDocument}
              onChange={(e) => setTypeDocument(e.target.value)}
            >
              <option value="rapport_activite">Rapport d'activité</option>
              <option value="attestation_fiscale">Attestation fiscale</option>
              <option value="registre_commerce">Registre de commerce</option>
              <option value="statuts">Statuts</option>
              <option value="cni">CNI</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="file">Fichier</label>
            <input
              ref={fileInputRef}
              id="file"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
              className="w-full"
            />
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded text-sm">
              <FileText className="w-4 h-4 text-gray-500" />
              <span>{selectedFile.name}</span>
              <span className="text-gray-400">
                ({(selectedFile.size / 1024).toFixed(0)} Ko)
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Envoyer le rapport
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
