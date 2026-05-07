import { useState } from 'react';
import { Database, Download, Clock, HardDrive, RefreshCw, Info } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import { formatDateTime } from '@/utils/format';

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  termine: { label: 'Terminé', className: 'badge badge-conforme' },
  en_cours: { label: 'En cours', className: 'badge badge-encours' },
  echoue: { label: 'Échoué', className: 'badge badge-rejete' },
};

export default function BackupPage() {
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { data: backups, isLoading, error: loadError, refetch } = useApi(
    () => adminApi.listBackups(),
    []
  );

  async function handleCreateBackup() {
    const confirmed = window.confirm(
      'Créer un backup manuel ? Cette opération peut prendre quelques secondes selon le volume.'
    );
    if (!confirmed) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const r = await adminApi.createBackup();
      setSuccess(`Backup créé : ${r.filename} (${r.taille}).`);
      refetch();
    } catch {
      setError('Erreur lors de la création du backup.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDownload(filename: string) {
    try {
      await adminApi.downloadBackup(filename);
    } catch {
      setError('Erreur lors du téléchargement.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <Database className="w-7 h-7 text-[var(--artci-green)]" />
        Backup & Restauration
      </h1>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-[var(--artci-orange)]" />
          Backup automatique
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded">
            <p className="text-xs text-gray-500 mb-1">Fréquence</p>
            <p className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Quotidien (02h00)
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <p className="text-xs text-gray-500 mb-1">Rétention</p>
            <p className="text-sm font-semibold flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-gray-400" />
              30 jours
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <p className="text-xs text-gray-500 mb-1">Dernier backup</p>
            <p className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              {backups && backups.length > 0
                ? formatDateTime(backups[0].createdAt)
                : 'Aucun backup'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            La planification automatique est gérée au niveau du serveur (cron). Les backups
            manuels sont disponibles ci-dessous.
          </p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-[var(--artci-orange)]" />
          Créer un backup manuel
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Sauvegarde JSON de l'ensemble des tables (hors mots de passe).
        </p>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="btn btn-primary flex items-center gap-2"
        >
          {creating ? (
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          ) : (
            <Database className="w-4 h-4" />
          )}
          Créer backup
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">Historique des backups</h2>

        {isLoading && <Loading text="Chargement..." />}
        {loadError && <ErrorDisplay message={loadError} onRetry={refetch} />}

        {backups && backups.length === 0 && (
          <EmptyState
            title="Aucun backup"
            description="Créez votre premier backup en cliquant sur le bouton ci-dessus."
            icon={Database}
          />
        )}

        {backups && backups.length > 0 && (
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fichier</th>
                  <th>Taille</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => {
                  const config = STATUT_CONFIG[b.statut] ?? { label: b.statut, className: 'badge' };
                  return (
                    <tr key={b.filename}>
                      <td className="text-sm whitespace-nowrap">{formatDateTime(b.createdAt)}</td>
                      <td className="text-xs font-mono">{b.filename}</td>
                      <td className="text-sm font-mono">{b.taille}</td>
                      <td className="text-sm">
                        <span className={b.type === 'automatique' ? 'badge badge-encours' : 'badge badge-achevee'}>
                          {b.type === 'automatique' ? 'Automatique' : 'Manuel'}
                        </span>
                      </td>
                      <td>
                        <span className={config.className}>{config.label}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDownload(b.filename)}
                          className="btn btn-outline text-xs py-1 px-2 inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Télécharger
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
