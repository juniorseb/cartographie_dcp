import { useState, useCallback } from 'react';
import {
  Bell, FileText, Clock, CheckCircle, RefreshCw, Link2, CheckCheck,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as adminApi from '@/api/admin.api';
import Loading from '@/components/common/Loading';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import EmptyState from '@/components/common/EmptyState';
import { formatDateTime } from '@/utils/format';
import type { LucideIcon } from 'lucide-react';

const TYPE_ICONS: Record<string, LucideIcon> = {
  nouvelle_demande: FileText,
  echeance: Clock,
  validation: CheckCircle,
  renouvellement: RefreshCw,
  rapprochement: Link2,
};

const TYPE_COLORS: Record<string, string> = {
  nouvelle_demande: 'text-blue-500',
  echeance: 'text-orange-500',
  validation: 'text-green-500',
  renouvellement: 'text-purple-500',
  rapprochement: 'text-cyan-600',
};

export default function NotificationsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [lueFilter, setLueFilter] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(
    () =>
      adminApi.getNotifications({
        type: typeFilter || undefined,
        lue: lueFilter === '' ? undefined : lueFilter === 'true',
      }),
    [typeFilter, lueFilter]
  );

  const { data, isLoading, error, refetch } = useApi(fetchNotifications, [typeFilter, lueFilter]);

  async function handleMarkRead(id: string) {
    try {
      await adminApi.markNotificationRead(id);
      refetch();
    } catch {
      // erreur silencieuse
    }
  }

  async function handleMarkAllRead() {
    if (!data || data.length === 0) return;
    setMarkingAll(true);
    try {
      const unread = data.filter((n) => !n.lue);
      for (const notif of unread) {
        await adminApi.markNotificationRead(notif.id);
      }
      refetch();
    } catch {
      // erreur silencieuse
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = data ? data.filter((n) => !n.lue).length : 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl flex items-center gap-3">
          <Bell className="w-7 h-7 text-[var(--artci-orange)]" />
          Notifications
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            className="btn btn-secondary text-sm py-2 px-4 flex items-center gap-2"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            <CheckCheck className="w-4 h-4" />
            Marquer tout comme lu
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <div className="form-group mb-0">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full py-2.5"
          >
            <option value="">Tous les types</option>
            <option value="nouvelle_demande">Nouvelle demande</option>
            <option value="echeance">Echeance</option>
            <option value="validation">Validation</option>
            <option value="renouvellement">Renouvellement</option>
            <option value="rapprochement">Rapprochement</option>
          </select>
        </div>
        <div className="form-group mb-0">
          <select
            value={lueFilter}
            onChange={(e) => setLueFilter(e.target.value)}
            className="w-full py-2.5"
          >
            <option value="">Toutes</option>
            <option value="false">Non lues</option>
            <option value="true">Lues</option>
          </select>
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <Loading fullPage text="Chargement des notifications..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Aucune notification"
          description="Vous n'avez aucune notification pour le moment."
          icon={Bell}
        />
      ) : (
        <div className="space-y-3">
          {data.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] ?? Bell;
            const iconColor = TYPE_COLORS[notif.type] ?? 'text-gray-500';

            return (
              <div
                key={notif.id}
                className={`card ${!notif.lue ? 'border-l-4 border-l-[var(--artci-orange)]' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-1 ${iconColor}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{notif.titre}</p>
                        <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {notif.lue ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500">
                            Lue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                            Non lue
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-400">{formatDateTime(notif.createdAt)}</p>
                      {!notif.lue && (
                        <button
                          className="text-xs text-[var(--artci-green)] hover:underline"
                          onClick={() => handleMarkRead(notif.id)}
                        >
                          Marquer comme lue
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
