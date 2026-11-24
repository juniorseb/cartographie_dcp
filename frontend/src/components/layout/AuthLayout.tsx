import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Map as MapIcon, Lock, BadgeCheck } from 'lucide-react';
import logoDcp from '@/assets/logo-cartographie-dcp.png';
import { ROUTES } from '@/utils/constants';

const POINTS = [
  { icon: MapIcon, texte: 'Figurez sur la carte nationale de la conformité' },
  { icon: BadgeCheck, texte: "Dossier évalué et suivi par les agents de l'ARTCI" },
  { icon: Lock, texte: 'Accès sécurisé par code OTP et historique tracé' },
];

export default function AuthLayout() {
  const location = useLocation();
  // Inscription : box plus large (3 sections, plusieurs champs cote a cote)
  const isWide = location.pathname === ROUTES.REGISTER;

  return (
    <div className="min-h-screen flex bg-[var(--brand-bg)]">
      {/* Panneau de marque (desktop) — masque sur l'inscription pour laisser la place au formulaire */}
      {!isWide && (
        <aside className="hidden lg:flex relative w-[42%] max-w-[620px] overflow-hidden bg-[var(--brand-dark)] text-white flex-col justify-between p-12">
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
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
              Espace organisme
            </span>
            <h2 className="mt-5 text-3xl xl:text-4xl font-extrabold leading-tight text-white">
              Rendez visible la conformité de votre organisme
            </h2>
            <ul className="mt-8 space-y-4">
              {POINTS.map(({ icon: Icon, texte }) => (
                <li key={texte} className="flex items-center gap-3 text-white/85">
                  <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                  {texte}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-white/60">
            © {new Date().getFullYear()} ARTCI — Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire
          </p>
        </aside>
      )}

      {/* Formulaire */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12">
        <Link
          to={ROUTES.HOME}
          className={`${isWide ? 'flex' : 'flex lg:hidden'} self-start sm:self-center items-center gap-3 no-underline mb-8 hover:opacity-80 transition-opacity`}
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
