import { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import * as adminApi from '@/api/admin.api';
import type { ImportResult } from '@/types/admin';

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError('');
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls'))) {
      setFile(dropped);
      setResult(null);
      setError('');
    } else {
      setError('Format non supporté. Utilisez .xlsx ou .xls.');
    }
  }, []);

  async function handleDownloadTemplate() {
    setDownloading(true);
    try {
      await adminApi.downloadImportTemplate();
    } catch {
      setError('Erreur lors du téléchargement du template.');
    } finally {
      setDownloading(false);
    }
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

  function handleReset() {
    setFile(null);
    setResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const totalLines = result ? result.imported + result.errors.length : 0;
  const tauxReussite = totalLines > 0 ? Math.round((result!.imported / totalLines) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <Upload className="w-7 h-7 text-[var(--artci-orange)]" />
        Import Excel
      </h1>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {/* Étape 1 : Télécharger le template */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[var(--artci-orange)] text-white flex items-center justify-center text-sm font-bold">1</span>
          Télécharger le template
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Téléchargez le fichier Excel pré-formaté avec les 51 colonnes du questionnaire de recensement DCP.
        </p>
        <button
          onClick={handleDownloadTemplate}
          disabled={downloading}
          className="btn btn-primary flex items-center gap-2"
        >
          {downloading ? (
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Télécharger template.xlsx
        </button>
      </div>

      {/* Étape 2 : Upload avec drag & drop */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[var(--artci-orange)] text-white flex items-center justify-center text-sm font-bold">2</span>
          Uploader le fichier rempli
        </h3>

        <div
          className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-[var(--artci-orange)] bg-orange-50' : 'border-gray-300 bg-gray-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-[var(--artci-orange)]" />
          <p className="text-lg font-semibold text-[var(--artci-orange)] mb-2">
            Glisser-déposer le fichier ici
          </p>
          <p className="text-gray-500 mb-4">ou</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          >
            Parcourir les fichiers
          </button>
          <p className="text-xs text-gray-400 mt-3">Formats acceptés : .xlsx, .xls (Max 10 MB)</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        {file && (
          <div className="mt-4 flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} Ko)</span>
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn btn-primary flex items-center gap-2"
            >
              {uploading ? (
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Importer
            </button>
          </div>
        )}
      </div>

      {/* Étape 3 : Prévisualisation & Résultat */}
      {result && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[var(--artci-orange)] text-white flex items-center justify-center text-sm font-bold">3</span>
            Résultat de l'import
          </h3>

          {/* Compteurs */}
          <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--artci-orange)]">{totalLines}</p>
              <p className="text-xs text-gray-500">Lignes totales</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#228B22]">{result.imported}</p>
              <p className="text-xs text-gray-500">Valides</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#DC143C]">{result.errors.length}</p>
              <p className="text-xs text-gray-500">Erreurs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{tauxReussite}%</p>
              <p className="text-xs text-gray-500">Taux réussite</p>
            </div>
          </div>

          {/* Erreurs détaillées */}
          {result.errors.length > 0 && (
            <div className="space-y-2 mb-4">
              {result.errors.map((err, i) => (
                <div
                  key={i}
                  className="p-3 bg-white rounded border-l-4 border-[#DC143C]"
                >
                  <strong className="text-[#DC143C]">Ligne {err.row} :</strong>{' '}
                  <span className="text-sm text-gray-600">{err.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bouton recommencer */}
          <button
            onClick={handleReset}
            className="btn btn-outline flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Choisir un autre fichier
          </button>
        </div>
      )}
    </div>
  );
}
