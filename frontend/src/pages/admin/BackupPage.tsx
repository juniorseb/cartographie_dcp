import { useState } from 'react';
import { Database, Download, Clock, HardDrive, RefreshCw, Info } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/format';

interface BackupItem {
  id: string;
  createdAt: string;
  taille: string;
  type: 'automatique' | 'manuel';
  statut: 'termine' | 'en_cours' | 'echoue';
}

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  termine: { label: 'Terminé', className: 'badge badge-conforme' },
  en_cours: { label: 'En cours', className: 'badge badge-encours' },
  echoue: { label: 'Échoué', className: 'badge badge-rejete' },
};

// Données de démonstration — sera remplacé par un appel API
const backups: BackupItem[] = [];

export default function BackupPage() {
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleCreateBackup() {
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir créer un backup manuel ? Cette opération peut prendre plusieurs minutes.'
    );
    if (!confirmed) return;

    setCreating(true);
    setError('');
    setSuccess('');
    try {
      // API sera ajoutée ultérieurement
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSuccess('Backup manuel créé avec succès.');
    } catch {
      setError('Erreur lors de la création du backup.');
    } finally {
      setCreating(false);
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

      {/* Section 1 : Backup automatique */}
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
              {backups.length > 0
                ? formatDateTime(backups[0].createdAt)
                : 'Aucun backup effectué'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>
            La configuration des backups automatiques est gérée au niveau du serveur.
            Contactez l'administrateur système pour modifier la fréquence ou la rétention.
          </p>
        </div>
      </div>

      {/* Section 2 : Créer un backup manuel */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-[var(--artci-orange)]" />
          Créer un backup manuel
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Vous pouvez créer un backup à la demande. Cette opération sauvegarde l'intégralité
          de la base de données ainsi que les fichiers uploadés.
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

      {/* Section 3 : Liste des backups */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Historique des backups</h2>

        {backups.length === 0 ? (
          <EmptyState
            title="Aucun backup enregistré"
            description="L'historique des backups apparaîtra ici une fois la configuration effectuée et les premiers backups réalisés."
            icon={Database}
          />
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Taille</th>
                  <th>Type</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => {
                  const config = STATUT_CONFIG[backup.statut] ?? {
                    label: backup.statut,
                    className: 'badge',
                  };
                  return (
                    <tr key={backup.id}>
                      <td className="text-sm whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {formatDateTime(backup.createdAt)}
                        </span>
                      </td>
                      <td className="text-sm font-mono">{backup.taille}</td>
                      <td className="text-sm">
                        <span
                          className={
                            backup.type === 'automatique'
                              ? 'badge badge-encours'
                              : 'badge badge-achevee'
                          }
                        >
                          {backup.type === 'automatique' ? 'Automatique' : 'Manuel'}
                        </span>
                      </td>
                      <td>
                        <span className={config.className}>{config.label}</span>
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
