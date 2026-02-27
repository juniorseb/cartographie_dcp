import { useState } from 'react';
import { BookOpen, HelpCircle, Phone, Mail, MapPin, ExternalLink, ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'Comment s\'inscrire sur la plateforme ?',
    answer: 'Rendez-vous sur la page d\'inscription, renseignez votre dénomination, numéro de compte contribuable, email et mot de passe. Un code OTP vous sera envoyé par email pour vérifier votre compte.',
  },
  {
    question: 'Qui peut accéder à la plateforme ?',
    answer: 'Toute personne physique ou morale traitant des données à caractère personnel en Côte d\'Ivoire peut s\'inscrire. La partie publique (carte, liste, statistiques) est accessible à tous sans inscription.',
  },
  {
    question: 'Comment mettre à jour mon dossier ?',
    answer: 'Connectez-vous à votre espace entreprise, accédez à "Mon Dossier" et cliquez sur "Modifier". Vous pouvez mettre à jour vos informations tant que votre dossier est en brouillon ou si des compléments vous sont demandés.',
  },
  {
    question: 'Qu\'est-ce qu\'un DPO (Délégué à la Protection des Données) ?',
    answer: 'Le DPO est la personne chargée de veiller au respect de la réglementation en matière de protection des données au sein de votre organisme. Il peut être interne (salarié) ou externe (prestataire). Sa désignation est obligatoire dans certains cas prévus par la loi.',
  },
  {
    question: 'Quels documents dois-je fournir ?',
    answer: 'Selon votre situation : registre de commerce, CNI du responsable légal, attestation fiscale, politique de sécurité, registre des traitements. La liste complète est indiquée dans le formulaire de déclaration.',
  },
  {
    question: 'Combien de temps dure le processus de mise en conformité ?',
    answer: 'Après soumission de votre dossier, un agent ARTCI est assigné pour vérification. Le délai moyen de traitement est de 7 jours ouvrés. Vous serez notifié à chaque étape du processus.',
  },
];

export default function AProposPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Mission ARTCI */}
      <section className="mb-10">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-[var(--artci-orange)]" />
          À Propos
        </h1>
        <div className="card card-orange">
          <h2 className="text-xl font-bold mb-3">Mission de l'ARTCI</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            L'Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI) est l'organe en charge
            de la protection des données à caractère personnel conformément à la <strong>Loi N°2013-450 du 19 juin 2013</strong> relative
            à la protection des données à caractère personnel.
          </p>
          <p className="text-gray-700 leading-relaxed">
            L'ARTCI veille au respect des droits fondamentaux des personnes physiques en matière de traitement
            des données personnelles et accompagne les responsables de traitement dans leur mise en conformité.
          </p>
        </div>
      </section>

      {/* Présentation plateforme */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Plateforme DCP</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-bold mb-2 text-[var(--artci-green)]">Objectifs</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>Recenser les responsables de traitement de données personnelles</li>
              <li>Cartographier les entités conformes sur le territoire ivoirien</li>
              <li>Faciliter les démarches de mise en conformité</li>
              <li>Assurer le suivi et le renouvellement des agréments</li>
            </ul>
          </div>
          <div className="card">
            <h3 className="font-bold mb-2 text-[var(--artci-green)]">Fonctionnalités</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>Carte interactive des entités conformes</li>
              <li>Formulaire de déclaration en ligne (50 questions)</li>
              <li>Suivi en temps réel de votre dossier</li>
              <li>Espace entreprise sécurisé (JWT + OTP)</li>
              <li>Tableau de bord et statistiques</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Cadre juridique */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Cadre Juridique</h2>
        <div className="card">
          <p className="text-gray-700 leading-relaxed mb-3">
            La protection des données à caractère personnel en Côte d'Ivoire est régie par :
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="font-bold text-[var(--artci-orange)] flex-shrink-0">1.</span>
              <span><strong>Loi N°2013-450 du 19 juin 2013</strong> — Relative à la protection des données à caractère personnel</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[var(--artci-orange)] flex-shrink-0">2.</span>
              <span><strong>Décret N°2014-105</strong> — Portant application de la loi N°2013-450</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-[var(--artci-orange)] flex-shrink-0">3.</span>
              <span><strong>Convention de l'Union Africaine</strong> — Sur la cyber-sécurité et la protection des données personnelles (Convention de Malabo)</span>
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[var(--artci-orange)]" />
          Questions Fréquentes
        </h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="card !p-0 overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm hover:bg-gray-50 transition-colors"
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`w-4 h-4 flex-shrink-0 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                />
              </button>
              {openFaq === index && (
                <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t">
                  <p className="pt-3">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-xl font-bold mb-4">Contact</h2>
        <div className="card card-green">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-[var(--artci-green)]">ARTCI — Direction de la Protection des Données</h3>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span>18 BP 2203 Abidjan 18, Côte d'Ivoire</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span>+225 20 34 43 73</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <a href="mailto:dcp@artci.ci" className="text-[var(--artci-green)] hover:underline">dcp@artci.ci</a>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold">Liens utiles</h3>
              <div className="space-y-2">
                <a
                  href="https://www.artci.ci"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--artci-green)] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Site officiel ARTCI
                </a>
                <a
                  href="https://www.artci.ci/index.php/protection-des-donnees-personnelles"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--artci-green)] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Espace Protection des Données
                </a>
                <a
                  href="https://www.artci.ci/images/stories/pdf/loi_2013-450.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[var(--artci-green)] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Loi N°2013-450 (PDF)
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
