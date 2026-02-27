import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import Loading from '@/components/common/Loading';
import PublicLayout, { PublicLayoutNoFooter } from '@/components/layout/PublicLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminLayout from '@/components/admin/AdminLayout';

// Lazy loading des pages publiques
const CartePage = lazy(() => import('@/pages/public/CartePage'));
const ListeEntitesPage = lazy(() => import('@/pages/public/ListeEntitesPage'));
const StatistiquesPage = lazy(() => import('@/pages/public/StatistiquesPage'));
const FicheEntitePage = lazy(() => import('@/pages/public/FicheEntitePage'));
const AProposPage = lazy(() => import('@/pages/public/AProposPage'));

// Lazy loading des pages auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const VerifyOTPPage = lazy(() => import('@/pages/auth/VerifyOTPPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));

// Lazy loading des pages entreprise
const DashboardPage = lazy(() => import('@/pages/entreprise/DashboardPage'));
const DemandePage = lazy(() => import('@/pages/entreprise/DemandePage'));
const MonDossierPage = lazy(() => import('@/pages/entreprise/MonDossierPage'));
const FeedbacksPage = lazy(() => import('@/pages/entreprise/FeedbacksPage'));
const RapportsPage = lazy(() => import('@/pages/entreprise/RapportsPage'));
const RenouvellementPage = lazy(() => import('@/pages/entreprise/RenouvellementPage'));
const ProfilPage = lazy(() => import('@/pages/entreprise/ProfilPage'));
const ChangePasswordPage = lazy(() => import('@/pages/auth/ChangePasswordPage'));
const MesAuditsPage = lazy(() => import('@/pages/entreprise/MesAuditsPage'));
const RapprochementPage = lazy(() => import('@/pages/entreprise/RapprochementPage'));

// Lazy loading des pages admin
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const EntitesAdminPage = lazy(() => import('@/pages/admin/EntitesAdminPage'));
const EntiteDetailAdminPage = lazy(() => import('@/pages/admin/EntiteDetailAdminPage'));
const EntiteCreatePage = lazy(() => import('@/pages/admin/EntiteCreatePage'));
const PanierPage = lazy(() => import('@/pages/admin/PanierPage'));
const AssignationPage = lazy(() => import('@/pages/admin/AssignationPage'));
const ValidationN1Page = lazy(() => import('@/pages/admin/ValidationN1Page'));
const FeedbackAdminPage = lazy(() => import('@/pages/admin/FeedbackAdminPage'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const UserFormPage = lazy(() => import('@/pages/admin/UserFormPage'));
const ImportPage = lazy(() => import('@/pages/admin/ImportPage'));
const LogsPage = lazy(() => import('@/pages/admin/LogsPage'));
const StatistiquesAdminPage = lazy(() => import('@/pages/admin/StatistiquesAdminPage'));
const ProfilAdminPage = lazy(() => import('@/pages/admin/ProfilAdminPage'));
const RapprochementsAdminPage = lazy(() => import('@/pages/admin/RapprochementsAdminPage'));
const RenouvellementAdminPage = lazy(() => import('@/pages/admin/RenouvellementAdminPage'));
const ValidationRapportsPage = lazy(() => import('@/pages/admin/ValidationRapportsPage'));
const NotificationsPage = lazy(() => import('@/pages/admin/NotificationsPage'));
const DemandesAutoPage = lazy(() => import('@/pages/admin/DemandesAutoPage'));
const AuditsAdminPage = lazy(() => import('@/pages/admin/AuditsAdminPage'));
const ParametresPage = lazy(() => import('@/pages/admin/ParametresPage'));
const HistoriqueImportsPage = lazy(() => import('@/pages/admin/HistoriqueImportsPage'));
const BackupPage = lazy(() => import('@/pages/admin/BackupPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading fullPage text="Chargement..." />}>
        <Routes>
          {/* Carte (sans footer) */}
          <Route element={<PublicLayoutNoFooter />}>
            <Route index element={<CartePage />} />
          </Route>

          {/* Routes publiques (avec footer) */}
          <Route element={<PublicLayout />}>
            <Route path="entites" element={<ListeEntitesPage />} />
            <Route path="entites/:id" element={<FicheEntitePage />} />
            <Route path="statistiques" element={<StatistiquesPage />} />
            <Route path="a-propos" element={<AProposPage />} />
          </Route>

          {/* Routes auth */}
          <Route element={<AuthLayout />}>
            <Route path="connexion" element={<LoginPage />} />
            <Route path="inscription" element={<RegisterPage />} />
            <Route path="verification-otp" element={<VerifyOTPPage />} />
            <Route path="mot-de-passe-oublie" element={<ForgotPasswordPage />} />
            <Route path="reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
          </Route>

          {/* Routes entreprise (protégées) */}
          <Route
            element={
              <ProtectedRoute requiredType="entreprise">
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="entreprise" element={<DashboardPage />} />
            <Route path="entreprise/demande" element={<DemandePage />} />
            <Route path="entreprise/demande/:id" element={<DemandePage />} />
            <Route path="entreprise/mon-dossier" element={<MonDossierPage />} />
            <Route path="entreprise/feedbacks" element={<FeedbacksPage />} />
            <Route path="entreprise/rapports" element={<RapportsPage />} />
            <Route path="entreprise/renouvellement" element={<RenouvellementPage />} />
            <Route path="entreprise/profil" element={<ProfilPage />} />
            <Route path="entreprise/changer-mot-de-passe" element={<ChangePasswordPage />} />
            <Route path="entreprise/audits" element={<MesAuditsPage />} />
            <Route path="entreprise/rapprochement" element={<RapprochementPage />} />
          </Route>

          {/* Route login admin (standalone) */}
          <Route path="admin/connexion" element={<AdminLoginPage />} />

          {/* Routes admin (protégées) */}
          <Route
            element={
              <ProtectedRoute requiredType="artci">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/entites" element={<EntitesAdminPage />} />
            <Route path="admin/entites/nouveau" element={<EntiteCreatePage />} />
            <Route path="admin/entites/:id" element={<EntiteDetailAdminPage />} />
            <Route path="admin/panier" element={<PanierPage />} />
            <Route path="admin/assignation" element={<AssignationPage />} />
            <Route path="admin/validation" element={<ValidationN1Page />} />
            <Route path="admin/feedbacks" element={<FeedbackAdminPage />} />
            <Route path="admin/utilisateurs" element={<UsersPage />} />
            <Route path="admin/utilisateurs/nouveau" element={<UserFormPage />} />
            <Route path="admin/utilisateurs/:id" element={<UserFormPage />} />
            <Route path="admin/import" element={<ImportPage />} />
            <Route path="admin/logs" element={<LogsPage />} />
            <Route path="admin/statistiques" element={<StatistiquesAdminPage />} />
            <Route path="admin/profil" element={<ProfilAdminPage />} />
            <Route path="admin/rapprochements" element={<RapprochementsAdminPage />} />
            <Route path="admin/renouvellements" element={<RenouvellementAdminPage />} />
            <Route path="admin/rapports-validation" element={<ValidationRapportsPage />} />
            <Route path="admin/notifications" element={<NotificationsPage />} />
            <Route path="admin/demandes-auto" element={<DemandesAutoPage />} />
            <Route path="admin/audits" element={<AuditsAdminPage />} />
            <Route path="admin/parametres" element={<ParametresPage />} />
            <Route path="admin/imports-historique" element={<HistoriqueImportsPage />} />
            <Route path="admin/backup" element={<BackupPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
