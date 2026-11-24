import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Map as MapIcon, Search, UserPlus, ClipboardList, BadgeCheck,
  Globe, Lock, Eye, ArrowRight, ExternalLink, FileCheck, MessageCircle, Building2,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import * as publicApi from '@/api/public.api';
import { ROUTES } from '@/utils/constants';

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
      {/* ========== HERO ========== */}
      <section className="relative overflow-hidden bg-[var(--brand-dark)] text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          aria-hidden
          className="absolute -right-32 -top-32 w-[520px] h-[520px] rounded-full bg-[var(--brand-primary)] opacity-25 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -left-40 -bottom-48 w-[460px] h-[460px] rounded-full bg-[var(--brand-secondary)] opacity-20 blur-3xl"
        />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-24 grid lg:grid-cols-[1.25fr_1fr] gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
              <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
              Plateforme officielle de l'ARTCI
            </span>
            <h1 className="mt-5 text-3xl md:text-[46px] font-extrabold leading-tight text-white">
              Cartographie nationale des organismes conformes à la protection des données personnelles
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/80 max-w-2xl">
              Consultez librement les organismes publics et privés évalués par l'ARTCI, et
              inscrivez votre organisme pour figurer sur la carte de la conformité en Côte d'Ivoire.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to={ROUTES.MAP} className="btn btn-primary text-base px-6 py-3">
                <MapIcon className="w-5 h-5" />
                Explorer la carte
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="btn text-base px-6 py-3 border-white/70 text-white hover:bg-white hover:border-white hover:text-[var(--brand-dark)]"
              >
                <UserPlus className="w-5 h-5" />
                Inscrire mon organisme
              </Link>
            </div>
          </div>

          {/* Chiffres cles (ou message tant qu'aucun organisme n'est publie) */}
          {conformes + partiels > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              <StatTile valeur={conformes + partiels} label="Organismes publiés" large />
              <StatTile valeur={conformes} label="Conformes" dot="var(--status-conforme)" />
              <StatTile valeur={partiels} label="Partiellement conformes" dot="var(--status-achevee)" />
              <StatTile valeur={secteurs} label="Secteurs d'activité" />
            </div>
          ) : (
            <div className="rounded-[var(--radius-card)] bg-white/10 border border-white/15 backdrop-blur-sm p-6 md:p-8">
              <span className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                <BadgeCheck className="w-6 h-6 text-[var(--brand-primary)]" />
              </span>
              <h2 className="mt-4 text-xl text-white">Évaluations en cours</h2>
              <p className="mt-2 text-sm text-white/80">
                Les organismes recensés sont actuellement en cours d'évaluation par l'ARTCI.
                Ils apparaîtront sur la carte dès leur publication.
              </p>
            </div>
          )}
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
              <span className="absolute top-5 right-5 text-4xl font-extrabold text-[var(--brand-primary-soft)] select-none">
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

function StatTile({
  valeur, label, large, dot,
}: { valeur: number; label: string; large?: boolean; dot?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] bg-white/10 border border-white/15 backdrop-blur-sm p-5 ${
        large ? 'col-span-2' : ''
      }`}
    >
      <div className={`font-extrabold ${large ? 'text-5xl' : 'text-3xl'}`}>
        {valeur.toLocaleString('fr-FR')}
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
        {dot && <span className="w-2.5 h-2.5 rounded-full" style={{ background: dot }} />}
        {label}
      </div>
    </div>
  );
}
