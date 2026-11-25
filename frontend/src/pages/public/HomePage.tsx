import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Map as MapIcon, Search, UserPlus, ClipboardList, BadgeCheck,
  Globe, Lock, Eye, ArrowRight, ExternalLink, FileCheck, MessageCircle, Building2,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as publicApi from '@/api/public.api';
import { ROUTES } from '@/utils/constants';
import heroInstitution from '@/assets/hero-institution.webp';
import heroInstitutionSm from '@/assets/hero-institution-960.webp';
import heroSecurite from '@/assets/hero-securite.webp';
import heroSecuriteSm from '@/assets/hero-securite-960.webp';

const SLIDES = [
  { src: heroInstitution, srcSmall: heroInstitutionSm },
  { src: heroSecurite, srcSmall: heroSecuriteSm },
];

const ETAPES = [
  {
    icon: UserPlus,
    titre: 'Inscription',
    texte: "L'organisme crée son compte et vérifie l'adresse email de son responsable légal.",
  },
  {
    icon: ClipboardList,
    titre: 'Cartographie',
    texte: 'Il renseigne ses traitements, finalités, catégories de données, sous-traitants et mesures de sécurité.',
  },
  {
    icon: FileCheck,
    titre: 'Évaluation ARTCI',
    texte: "Les agents de l'ARTCI analysent le dossier et attribuent un statut de conformité.",
  },
  {
    icon: MapIcon,
    titre: 'Publication',
    texte: 'Les organismes conformes ou partiellement conformes sont publiés sur la carte nationale.',
  },
];

const ATOUTS = [
  {
    icon: Eye,
    titre: 'Transparence',
    texte: 'Chaque citoyen peut vérifier si un organisme respecte la protection de ses données personnelles.',
  },
  {
    icon: BadgeCheck,
    titre: "Validé par l'ARTCI",
    texte: "Seuls les organismes évalués par l'ARTCI apparaissent sur la cartographie publique.",
  },
  {
    icon: Lock,
    titre: 'Sécurité & traçabilité',
    texte: 'Accès protégé par OTP, historique complet des échanges et des décisions sur chaque dossier.',
  },
  {
    icon: Globe,
    titre: 'Accessible partout',
    texte: 'Carte, liste, statistiques et exports consultables librement depuis un ordinateur ou un mobile.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data: stats } = useApi(() => publicApi.getStats(), []);

  // Diaporama : fondu toutes les 7 s, en pause si onglet masque ou mouvement reduit
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      if (!document.hidden) setSlide((s) => (s + 1) % SLIDES.length);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  const conformes = stats?.total_entites_conformes ?? 0;
  const partiels = stats?.total_partiellement_conformes ?? 0;
  const secteurs = Object.keys(stats?.par_secteur ?? {}).length;

  function rechercher(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `${ROUTES.ENTITES}?search=${encodeURIComponent(q)}` : ROUTES.ENTITES);
  }

  return (
    <div className="bg-[var(--brand-bg)]">
      {/* ========== HERO (visuels clairs en fondu) ========== */}
      <section className="relative overflow-hidden bg-[#F7F9FD] min-h-[520px] md:min-h-[600px] flex items-center">
        {/* Grand ecran (xl+) : image entiere (non rognee) a droite, centree verticalement,
            bords fondus et legerement transparente (effet "verre blanc").
            Tablette/mobile : image en fond plein cadre sous un voile. */}
        <div aria-hidden className="absolute inset-0 xl:left-[34%] 2xl:left-[30%] [--hero-img-op:1] xl:[--hero-img-op:0.62]">
          {SLIDES.map((sl, i) => (
            <img
              key={sl.src}
              src={sl.src}
              srcSet={`${sl.srcSmall} 960w, ${sl.src} 1672w`}
              sizes="(min-width: 1280px) 70vw, 100vw"
              alt=""
              decoding="async"
              className="hero-slide absolute inset-0 w-full h-full object-cover object-[72%_center] xl:inset-auto xl:right-0 xl:top-1/2 xl:-translate-y-1/2 xl:h-auto saturate-[0.85] transition-opacity duration-[1200ms] ease-in-out"
              style={{ opacity: i === slide ? 'var(--hero-img-op)' : 0 }}
            />
          ))}
        </div>
        {/* Voile de lisibilite : fort a gauche (texte), transparent a droite (illustration) */}
        <div
          aria-hidden
          className="absolute inset-0 hidden xl:block"
          style={{
            background:
              'linear-gradient(90deg, rgba(247,249,253,0.9) 0%, rgba(247,249,253,0.7) 38%, rgba(247,249,253,0) 56%)',
          }}
        />
        <div aria-hidden className="absolute inset-0 xl:hidden bg-[rgba(247,249,253,0.55)]" />

        <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8 pt-12 pb-20 md:pt-16 md:pb-24">
          {/* Couche de lisibilite : panneau translucide derriere le texte */}
          <div className="max-w-[680px] rounded-3xl bg-white/80 backdrop-blur-md border border-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.12)] p-6 sm:p-8 md:p-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-white border border-[var(--brand-gray)] shadow-sm px-3 py-1 text-xs font-bold tracking-wide uppercase text-[var(--brand-dark)]">
              <ShieldCheck className="w-4 h-4 text-[var(--brand-secondary)]" />
              Plateforme officielle de l'ARTCI
            </span>
            <h1 className="mt-5 text-[30px] md:text-[40px] font-extrabold leading-[1.15] text-[var(--brand-dark)]">
              Cartographie nationale des organismes{' '}
              <span className="text-[var(--brand-primary)]">conformes</span> à la protection des
              données personnelles
            </h1>
            <p className="mt-5 text-base md:text-lg text-[#334155]">
              Consultez librement les organismes publics et privés évalués par l'ARTCI, et
              inscrivez votre organisme pour figurer sur la carte de la conformité en Côte d'Ivoire.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to={ROUTES.MAP} className="btn btn-primary text-base px-6 py-3 shadow-[0_8px_20px_rgba(255,140,0,0.3)]">
                <MapIcon className="w-5 h-5" />
                Explorer la carte
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="btn text-base px-6 py-3 bg-white border-[var(--brand-dark)] text-[var(--brand-dark)] hover:bg-[var(--brand-dark)] hover:text-white"
              >
                <UserPlus className="w-5 h-5" />
                Inscrire mon organisme
              </Link>
            </div>

            {/* Chiffres cles (affiches des qu'au moins un organisme est publie) */}
            {conformes + partiels > 0 && (
              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
                  <HeroStat valeur={conformes + partiels} label="Organismes publiés" />
                  <HeroStat valeur={conformes} label="Conformes" dot="var(--status-conforme)" />
                  <HeroStat valeur={partiels} label="Partiellement conformes" dot="var(--status-achevee)" />
                  <HeroStat valeur={secteurs} label="Secteurs d'activité" />
                </dl>
            )}
          </div>

          {/* Indicateurs du diaporama */}
          <div className="absolute bottom-14 md:bottom-16 right-4 md:right-8 flex gap-2">
            {SLIDES.map((sl, i) => (
              <button
                key={sl.src}
                type="button"
                onClick={() => setSlide(i)}
                aria-label={`Afficher le visuel ${i + 1}`}
                aria-current={i === slide}
                className={`h-2.5 rounded-full transition-all ${
                  i === slide ? 'w-8 bg-[var(--brand-primary)]' : 'w-2.5 bg-slate-400/70 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ========== VERIFIER LA CONFORMITE ========== */}
      <section className="relative -mt-8 md:-mt-10 px-4 md:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-[var(--radius-card)] shadow-hover p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-full bg-[var(--brand-primary-soft)] flex items-center justify-center">
              <Search className="w-5 h-5 text-[var(--brand-primary)]" />
            </span>
            <div>
              <h2 className="text-xl md:text-2xl">Vérifier la conformité d'un organisme</h2>
              <p className="text-sm text-[var(--brand-muted)]">
                Recherchez par raison sociale ou numéro RCCM.
              </p>
            </div>
          </div>
          <form onSubmit={rechercher} className="flex flex-col sm:flex-row gap-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex. : Banque, opérateur, ministère…"
              aria-label="Nom de l'organisme"
              className="flex-1 min-w-0 px-4 py-3 rounded-[10px] border border-gray-300 text-base focus:outline-none focus:border-[var(--brand-primary)] focus:ring-[3px] focus:ring-[rgba(255,140,0,0.18)]"
            />
            <button type="submit" className="btn btn-primary px-6 py-3">
              <Search className="w-4 h-4" />
              Rechercher
            </button>
          </form>
        </div>
      </section>

      {/* ========== COMMENT CA MARCHE ========== */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <SectionTitle
          surtitre="Parcours"
          titre="Comment un organisme apparaît sur la carte"
        />
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ETAPES.map(({ icon: Icon, titre, texte }, i) => (
            <li key={titre} className="card card-lift relative">
              <span aria-hidden className="absolute top-4 right-5 font-display text-5xl font-extrabold leading-none text-[var(--brand-primary)] opacity-30 select-none">
                {i + 1}
              </span>
              <span className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center mb-4">
                <Icon className="w-6 h-6" />
              </span>
              <h3 className="text-lg mb-2">{titre}</h3>
              <p className="text-sm text-[var(--brand-muted)]">{texte}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ========== CERTINUM (formalites) ========== */}
      <section className="px-4 md:px-8">
        <div className="max-w-7xl mx-auto rounded-[var(--radius-card)] bg-gradient-to-r from-[var(--brand-secondary)] to-[#00703A] text-white p-8 md:p-10 grid md:grid-cols-[auto_1fr_auto] gap-6 items-center">
          <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </span>
          <div>
            <h2 className="text-xl md:text-2xl text-white">
              Déclarations et demandes d'autorisation
            </h2>
            <p className="mt-1 text-white/85 text-sm md:text-base">
              Les formalités préalables (déclaration de traitement, autorisations, transferts
              internationaux, certificat de conformité) se font sur la plateforme officielle
              CERTINUM APDP.
            </p>
          </div>
          <a
            href={ROUTES.CERTINUM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn bg-white text-[var(--brand-dark)] hover:-translate-y-0.5 px-6 py-3 whitespace-nowrap"
          >
            Accéder à CERTINUM
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ========== ATOUTS ========== */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
        <SectionTitle surtitre="Pourquoi cette cartographie" titre="Une conformité visible et vérifiable" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ATOUTS.map(({ icon: Icon, titre, texte }) => (
            <div key={titre} className="card card-lift text-center">
              <span className="mx-auto w-14 h-14 rounded-full bg-[var(--brand-primary-soft)] flex items-center justify-center mb-4">
                <Icon className="w-7 h-7 text-[var(--brand-primary)]" />
              </span>
              <h3 className="text-lg mb-2">{titre}</h3>
              <p className="text-sm text-[var(--brand-muted)]">{texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== QUESTION ========== */}
      <section className="px-4 md:px-8 pb-16 md:pb-20">
        <div className="max-w-7xl mx-auto card flex flex-col md:flex-row items-start md:items-center gap-5 border-l-4 border-[var(--brand-accent)]">
          <MessageCircle className="w-10 h-10 text-[var(--brand-accent)] flex-shrink-0" />
          <div className="flex-1">
            <h2 className="text-xl">Une question ?</h2>
            <p className="text-sm text-[var(--brand-muted)]">
              Une information erronée sur un organisme, une difficulté d'inscription ? Les équipes de
              l'ARTCI vous répondent.
            </p>
          </div>
          <Link to={ROUTES.CONTACT} className="btn btn-outline">
            Nous contacter
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ surtitre, titre }: { surtitre: string; titre: string }) {
  return (
    <div className="text-center mb-10">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--brand-primary)]">
        {surtitre}
      </p>
      <h2 className="mt-2 text-2xl md:text-3xl">{titre}</h2>
      <span className="mt-4 mx-auto block w-14 h-1 rounded-full bg-[var(--brand-accent)]" />
    </div>
  );
}

function HeroStat({ valeur, label, dot }: { valeur: number; label: string; dot?: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-3xl font-extrabold text-[var(--brand-dark)]">
        {valeur.toLocaleString('fr-FR')}
      </dd>
      <dd className="mt-0.5 flex items-center gap-2 text-sm text-[var(--brand-muted)]" aria-hidden>
        {dot && <span className="w-2.5 h-2.5 rounded-full" style={{ background: dot }} />}
        {label}
      </dd>
    </div>
  );
}
