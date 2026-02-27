import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import * as adminApi from '@/api/admin.api';
import type { ImportResult } from '@/types/admin';

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError('');
  }

  async function handleUpload() {
    if (!file) {
      setError('Veuillez sélectionner un fichier Excel.');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);
    try {
      const res = await adminApi.importExcel(file);
      setResult(res);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setError("Erreur lors de l'import. Vérifiez le format du fichier.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <Upload className="w-7 h-7 text-[var(--artci-green)]" />
        Import Excel
      </h1>

      <div className="card">
        <div className="flex items-start gap-3 mb-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
          <FileSpreadsheet className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Format attendu</p>
            <p>
              Fichier Excel (.xlsx, .xls) avec les colonnes : denomination, numero_cc,
              forme_juridique, secteur_activite, adresse, ville, region, telephone, email.
            </p>
          </div>
        </div>

        {error && <div className="alert alert-danger mb-4">{error}</div>}

        <div className="form-group">
          <label>Fichier Excel</label>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[var(--artci-green)] file:text-white hover:file:opacity-80 cursor-pointer"
          />
        </div>

        {file && (
          <p className="text-sm text-gray-500 mb-4">
            Fichier sélectionné : <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} Ko)
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {uploading ? (
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Importer
        </button>
      </div>

      {result && (
        <div className="mt-6 card">
          <h2 className="text-lg font-semibold mb-4">Résultat de l'import</h2>

          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">
              {result.imported} entité(s) importée(s) avec succès
            </span>
          </div>

          {result.errors.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-600 font-medium">
                  {result.errors.length} erreur(s)
                </span>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Ligne</th>
                      <th>Erreur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((err, i) => (
                      <tr key={i}>
                        <td className="font-mono text-sm">{err.row}</td>
                        <td className="text-sm text-red-600">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
