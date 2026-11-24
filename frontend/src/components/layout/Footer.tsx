import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ExternalLink, ShieldCheck } from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import logoDcp from '@/assets/logo-cartographie-dcp.png';

const linkCls = 'text-white/75 hover:text-white no-underline transition-colors';

export default function Footer() {
  return (
    <footer className="bg-[var(--brand-dark)] text-white mt-auto">
      <div aria-hidden className="h-1 flex">
        <span className="flex-1 bg-[var(--brand-primary)]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-[var(--brand-secondary)]" />
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-12 pb-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        {/* Identite */}
        <div>
          <span className="inline-block bg-white rounded-xl px-4 py-3">
            <img src={logoDcp} alt="ARTCI — Cartographie DCP" className="h-12 w-auto object-contain" />
          </span>
          <p className="mt-4 text-sm text-white/75">
            Registre public des organismes évalués par l'Autorité de Régulation des
            Télécommunications/TIC de Côte d'Ivoire au titre de la loi n°2013-450 relative à la
            protection des données à caractère personnel.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
            Plateforme officielle de l'ARTCI
          </span>
        </div>

        {/* Navigation */}
        <FooterCol titre="Consulter">
          <li><Link to={ROUTES.MAP} className={linkCls}>Carte des organismes</Link></li>
          <li><Link to={ROUTES.ENTITES} className={linkCls}>Liste des organismes</Link></li>
          <li><Link to={ROUTES.STATISTIQUES} className={linkCls}>Statistiques</Link></li>
          <li><Link to={ROUTES.A_PROPOS} className={linkCls}>À propos</Link></li>
        </FooterCol>

        {/* Organismes */}
        <FooterCol titre="Organismes">
          <li><Link to={ROUTES.REGISTER} className={linkCls}>Inscrire mon organisme</Link></li>
          <li><Link to={ROUTES.LOGIN} className={linkCls}>Espace organisme</Link></li>
          <li>
            <a href={ROUTES.CERTINUM_URL} target="_blank" rel="noopener noreferrer" className={`${linkCls} inline-flex items-center gap-1`}>
              Déclarations & autorisations
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </li>
          <li><Link to={ROUTES.CONTACT} className={linkCls}>Nous contacter</Link></li>
        </FooterCol>

        {/* Contact */}
        <FooterCol titre="Contact">
          <li className="flex gap-2 text-white/75">
            <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-[var(--brand-primary)]" />
            <span>Abidjan - Marcory Anoumanbo<br />18 BP 2203 Abidjan 18</span>
          </li>
          <li className="flex gap-2 text-white/75">
            <Phone className="w-4 h-4 mt-1 flex-shrink-0 text-[var(--brand-primary)]" />
            <a href="tel:+2252720344373" className={linkCls}>+225 27 20 34 43 73</a>
          </li>
          <li className="flex gap-2 text-white/75">
            <Mail className="w-4 h-4 mt-1 flex-shrink-0 text-[var(--brand-primary)]" />
            <a href="mailto:courrier@artci.ci" className={linkCls}>courrier@artci.ci</a>
          </li>
        </FooterCol>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/60">
          <p>&copy; {new Date().getFullYear()} ARTCI — Tous droits réservés.</p>
          <p>Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-white mb-4 pb-2 border-b-2 border-[var(--brand-primary)] inline-block">
        {titre}
      </h4>
      <ul className="space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}
