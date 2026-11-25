import { Outlet, Link, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import logoDcp from '@/assets/logo-cartographie-dcp.png';
import { ROUTES } from '@/utils/constants';

export default function AuthLayout() {
  const location = useLocation();
  // Inscription : formulaire plus large (plusieurs champs cote a cote)
  const isWide = location.pathname === ROUTES.REGISTER;

  return (
    <div className="min-h-screen flex bg-[var(--brand-bg)]">
      {/* Panneau de marque (grand ecran) */}
      <aside
        className={`hidden lg:flex relative flex-shrink-0 overflow-hidden bg-[var(--brand-dark)] text-white flex-col justify-between p-10 xl:p-12 ${
          isWide ? 'w-[34%] max-w-[500px]' : 'w-[42%] max-w-[620px]'
        }`}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div aria-hidden className="absolute -left-40 -bottom-40 w-[480px] h-[480px] rounded-full bg-[var(--brand-secondary)] opacity-25 blur-3xl" />
        <div aria-hidden className="absolute -right-32 -top-32 w-[380px] h-[380px] rounded-full bg-[var(--brand-primary)] opacity-25 blur-3xl" />

        <Link to={ROUTES.HOME} className="relative inline-block self-start bg-white rounded-xl px-4 py-3 no-underline">
          <img src={logoDcp} alt="ARTCI — Cartographie DCP" className="h-12 w-auto object-contain" />
        </Link>

        <div className="relative">
          <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight text-white">
            {isWide ? 'Inscrivez votre organisme' : 'Espace organisme'}
          </h2>
          <p className="mt-4 text-white/75 max-w-sm">
            {isWide
              ? 'Créez votre compte pour déclarer la conformité de votre organisme auprès de l’ARTCI.'
              : 'Suivez le dossier de conformité de votre organisme.'}
          </p>
          <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-sm font-semibold">
            <Lock className="w-4 h-4 text-[var(--brand-primary)]" />
            Accès sécurisé
          </span>
        </div>

        <p className="relative text-xs text-white/55">
          © {new Date().getFullYear()} ARTCI — Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire
        </p>
      </aside>

      {/* Formulaire */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12">
        <Link
          to={ROUTES.HOME}
          className="flex lg:hidden self-start sm:self-center items-center gap-3 no-underline mb-8 hover:opacity-80 transition-opacity"
        >
          <img src={logoDcp} alt="ARTCI — Cartographie DCP" className="h-12 w-auto object-contain" />
        </Link>

        <div className={`card w-full my-auto ${isWide ? 'max-w-3xl' : 'max-w-md'} p-6 sm:p-8`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
