import { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, FileText, RefreshCw, Info } from 'lucide-react';
import * as adminApi from '@/api/admin.api';
import { cn } from '@/utils/cn';
import type { ImportResult } from '@/types/admin';

type ImportMode = 'excel' | 'boloforms';

interface ExtendedResult extends ImportResult {
  skipped?: number;
}

const MODE_CONFIG: Record<ImportMode, {
  label: string;
  description: string;
  accept: string;
  icon: typeof FileSpreadsheet;
  helper: string;
}> = {
  excel: {
    label: 'Template Excel ARTCI',
    description: '51 colonnes - Format simplifie pour la saisie manuelle.',
    accept: '.xlsx,.xls',
    icon: FileSpreadsheet,
    helper: 'Telechargez le template, remplissez-le, puis televersez.',
  },
  boloforms: {
    label: 'Export BoloForms / Google Forms',
    description: '171 colonnes - Reponses du formulaire officiel de recensement DCP.',
    accept: '.csv',
    icon: FileText,
    helper: 'Exportez les reponses au format CSV depuis Google Sheets / BoloForms.',
  },
};

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>('excel');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ExtendedResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const config = MODE_CONFIG[mode];

  function isAcceptedFile(name: string) {
    return config.accept.split(',').some((ext) => name.toLowerCase().endsWith(ext));
  }

  function handleModeChange(newMode: ImportMode) {
    setMode(newMode);
    setFile(null);
    setResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

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
    if (dropped && isAcceptedFile(dropped.name)) {
      setFile(dropped);
      setResult(null);
      setError('');
    } else {
      setError(`Format non supporte. Utilisez ${config.accept}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function handleDownloadTemplate() {
    setDownloading(true);
    try {
      await adminApi.downloadImportTemplate();
    } catch {
      setError('Erreur lors du telechargement du template.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError('Veuillez selectionner un fichier.');
      return;
    }
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const res = mode === 'excel'
        ? await adminApi.importExcel(file)
        : await adminApi.importBoloforms(file);
      setResult(res as ExtendedResult);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setError("Erreur lors de l'import. Verifiez le format du fichier.");
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

  const totalLines = result
    ? result.imported + result.errors.length + (result.skipped ?? 0)
    : 0;
  const tauxReussite = totalLines > 0 ? Math.round((result!.imported / totalLines) * 100) : 0;

  const Icon = config.icon;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <Upload className="w-7 h-7 text-[var(--artci-orange)]" />
        Import des entites
      </h1>

      {/* Selecteur de format */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-3">Choisir le format d'import</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(MODE_CONFIG) as ImportMode[]).map((m) => {
            const c = MODE_CONFIG[m];
            const ModeIcon = c.icon;
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={cn(
                  'text-left p-4 rounded-lg border-2 transition-colors',
                  active
                    ? 'border-[var(--artci-orange)] bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className="flex items-start gap-3">
                  <ModeIcon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', active ? 'text-[var(--artci-orange)]' : 'text-gray-400')} />
                  <div>
                    <div className="font-semibold text-sm">{c.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{c.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {/* Etape 1 : template (Excel uniquement) */}
      {mode === 'excel' && (
        <div className="card mb-6">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[var(--artci-orange)] text-white flex items-center justify-center text-sm font-bold">1</span>
            Telecharger le template
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Telechargez le fichier Excel pre-formate avec les 51 colonnes du questionnaire.
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
            Telecharger template.xlsx
          </button>
        </div>
      )}

      {mode === 'boloforms' && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">{config.helper}</p>
              <ul className="list-disc list-inside text-xs space-y-1 text-blue-800">
                <li>Les entites sont creees avec l'origine "Auto-recensement".</li>
                <li>Les doublons (meme N° CC) sont ignores automatiquement.</li>
                <li>Les personnes physiques sans CC recoivent un identifiant genere "PHYS-...".</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[var(--artci-orange)] text-white flex items-center justify-center text-sm font-bold">
            {mode === 'excel' ? '2' : '1'}
          </span>
          Televerser le fichier
        </h3>

        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer',
            dragOver ? 'border-[var(--artci-orange)] bg-orange-50' : 'border-gray-300 bg-gray-50'
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Icon className="w-12 h-12 mx-auto mb-3 text-[var(--artci-orange)]" />
          <p className="text-lg font-semibold text-[var(--artci-orange)] mb-2">
            Glisser-deposer le fichier ici
          </p>
          <p className="text-gray-500 mb-4">ou</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          >
            Parcourir les fichiers
          </button>
          <p className="text-xs text-gray-400 mt-3">Formats acceptes : {config.accept} (Max 10 MB)</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={config.accept}
          onChange={handleFileChange}
          className="hidden"
        />

        {file && (
          <div className="mt-4 flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{file.name}</span>
              <span className="text-xs text-gray-500 flex-shrink-0">({(file.size / 1024).toFixed(1)} Ko)</span>
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn btn-primary flex items-center gap-2 flex-shrink-0 ml-2"
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

      {/* Resultat */}
      {result && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[var(--artci-orange)] text-white flex items-center justify-center text-sm font-bold">
              {mode === 'excel' ? '3' : '2'}
            </span>
            Resultat de l'import
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--artci-orange)]">{totalLines}</p>
              <p className="text-xs text-gray-500">Lignes totales</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#228B22]">{result.imported}</p>
              <p className="text-xs text-gray-500">Importees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#DC143C]">{result.errors.length}</p>
              <p className="text-xs text-gray-500">Erreurs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{tauxReussite}%</p>
              <p className="text-xs text-gray-500">Taux reussite</p>
            </div>
          </div>

          {result.skipped !== undefined && result.skipped > 0 && (
            <div className="alert alert-info mb-4 text-sm">
              {result.skipped} ligne(s) ignoree(s) (doublon ou donnees insuffisantes).
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {result.errors.map((err, i) => (
                <div key={i} className="p-3 bg-white rounded border-l-4 border-[#DC143C]">
                  <strong className="text-[#DC143C]">Ligne {err.row} :</strong>{' '}
                  <span className="text-sm text-gray-600">{err.message}</span>
                </div>
              ))}
            </div>
          )}

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
