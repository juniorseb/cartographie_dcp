import { FileSpreadsheet, Clock } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/format';

interface ImportRecord {
  id: string;
  createdAt: string;
  importe_par: string;
  nom_fichier: string;
  lignes_totales: number;
  lignes_reussies: number;
  lignes_erreurs: number;
}

// Données de démonstration — sera remplacé par un appel API
const imports: ImportRecord[] = [];

function getTauxReussite(record: ImportRecord): string {
  if (record.lignes_totales === 0) return '0';
  return ((record.lignes_reussies / record.lignes_totales) * 100).toFixed(1);
}

export default function HistoriqueImportsPage() {
  return (
    <div>
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        <FileSpreadsheet className="w-7 h-7 text-[var(--artci-green)]" />
        Historique des Imports
      </h1>

      {imports.length === 0 ? (
        <EmptyState
          title="Aucun import enregistré"
          description="L'historique des imports Excel apparaîtra ici une fois que des fichiers auront été importés via la page d'import."
          icon={FileSpreadsheet}
        />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Importé par</th>
                <th>Nom du fichier</th>
                <th className="text-right">Lignes totales</th>
                <th className="text-right">Réussies</th>
                <th className="text-right">Erreurs</th>
                <th className="text-right">Taux réussite</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((record) => {
                const taux = getTauxReussite(record);
                const tauxNum = parseFloat(taux);
                return (
                  <tr key={record.id}>
                    <td className="text-sm whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatDateTime(record.createdAt)}
                      </span>
                    </td>
                    <td className="text-sm text-gray-700">{record.importe_par}</td>
                    <td className="text-sm font-mono">{record.nom_fichier}</td>
                    <td className="text-sm text-right">{record.lignes_totales}</td>
                    <td className="text-sm text-right text-green-600 font-medium">
                      {record.lignes_reussies}
                    </td>
                    <td className="text-sm text-right text-red-600 font-medium">
                      {record.lignes_erreurs}
                    </td>
                    <td className="text-sm text-right">
                      <span
                        className={
                          tauxNum >= 90
                            ? 'badge badge-conforme'
                            : tauxNum >= 50
                              ? 'badge badge-achevee'
                              : 'badge badge-rejete'
                        }
                      >
                        {taux} %
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
