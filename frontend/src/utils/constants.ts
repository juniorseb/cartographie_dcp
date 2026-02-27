import type { StatutConformite } from '@/types/enums';

/** Routes de l'application */
export const ROUTES = {
  // Public
  MAP: '/',
  ENTITES: '/entites',
  ENTITE_DETAIL: '/entites/:id',
  STATISTIQUES: '/statistiques',
  // Auth
  LOGIN: '/connexion',
  REGISTER: '/inscription',
  VERIFY_OTP: '/verification-otp',
  FORGOT_PASSWORD: '/mot-de-passe-oublie',
  RESET_PASSWORD: '/reinitialiser-mot-de-passe',
  // Entreprise
  ENTREPRISE_DASHBOARD: '/entreprise',
  ENTREPRISE_DEMANDE: '/entreprise/demande',
  ENTREPRISE_DEMANDE_EDIT: '/entreprise/demande/:id',
  ENTREPRISE_DOSSIER: '/entreprise/mon-dossier',
  ENTREPRISE_FEEDBACKS: '/entreprise/feedbacks',
  ENTREPRISE_RAPPORTS: '/entreprise/rapports',
  ENTREPRISE_RENOUVELLEMENT: '/entreprise/renouvellement',
  ENTREPRISE_PROFIL: '/entreprise/profil',
  ENTREPRISE_CHANGE_PASSWORD: '/entreprise/changer-mot-de-passe',
  // Admin
  ADMIN_LOGIN: '/admin/connexion',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_ENTITES: '/admin/entites',
  ADMIN_ENTITE_CREATE: '/admin/entites/nouveau',
  ADMIN_ENTITE_DETAIL: '/admin/entites/:id',
  ADMIN_PANIER: '/admin/panier',
  ADMIN_ASSIGNATION: '/admin/assignation',
  ADMIN_VALIDATION: '/admin/validation',
  ADMIN_FEEDBACKS: '/admin/feedbacks',
  ADMIN_USERS: '/admin/utilisateurs',
  ADMIN_USER_CREATE: '/admin/utilisateurs/nouveau',
  ADMIN_USER_EDIT: '/admin/utilisateurs/:id',
  ADMIN_IMPORT: '/admin/import',
  ADMIN_LOGS: '/admin/logs',
  ADMIN_STATISTIQUES: '/admin/statistiques',
  ADMIN_RAPPROCHEMENTS: '/admin/rapprochements',
  ADMIN_RENOUVELLEMENTS: '/admin/renouvellements',
  ADMIN_RAPPORTS_VALIDATION: '/admin/rapports-validation',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
  ADMIN_DEMANDES_AUTO: '/admin/demandes-auto',
  ADMIN_AUDITS: '/admin/audits',
  ADMIN_PARAMETRES: '/admin/parametres',
  ADMIN_IMPORTS_HISTORIQUE: '/admin/imports-historique',
  ADMIN_BACKUP: '/admin/backup',
  ADMIN_PROFIL: '/admin/profil',
  // Public
  A_PROPOS: '/a-propos',
  // Entreprise extras
  ENTREPRISE_AUDITS: '/entreprise/audits',
  ENTREPRISE_RAPPROCHEMENT: '/entreprise/rapprochement',
} as const;

/** Labels des statuts de conformité */
export const STATUT_CONFORMITE_LABELS: Record<StatutConformite, string> = {
  'Conforme': 'Conforme',
  'Démarche achevée': 'Démarche achevée',
  'Démarche en cours': 'Démarche en cours',
};

/** Classes CSS des badges par statut */
export const STATUT_CONFORMITE_BADGE: Record<StatutConformite, string> = {
  'Conforme': 'badge badge-conforme',
  'Démarche achevée': 'badge badge-achevee',
  'Démarche en cours': 'badge badge-encours',
};

/** Couleurs des statuts (pour les graphiques) */
export const STATUT_COLORS: Record<StatutConformite, string> = {
  'Conforme': '#228B22',
  'Démarche achevée': '#FF8C00',
  'Démarche en cours': '#4A90E2',
};

/** Centre de la carte : Abidjan, Côte d'Ivoire */
export const DEFAULT_MAP_CENTER: [number, number] = [5.3364, -4.0267];
export const DEFAULT_MAP_ZOOM = 7;

/** Pagination */
export const ITEMS_PER_PAGE = 20;

/** Couleurs ARTCI pour graphiques Recharts */
export const CHART_COLORS = [
  '#FF8C00', '#228B22', '#4A90E2', '#DC143C', '#9B59B6',
  '#1ABC9C', '#E67E22', '#2980B9', '#C0392B', '#27AE60',
];
