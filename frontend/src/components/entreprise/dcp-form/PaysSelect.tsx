/**
 * Selecteur multiple de pays avec recherche.
 * Spec : transferts hors CEDEAO -> on EXCLUT les 15 pays CEDEAO de la liste.
 */
import { useMemo, useRef, useState, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';

// Membres CEDEAO (exclus du selecteur "hors CEDEAO")
const CEDEAO = new Set([
  'Bénin', 'Burkina Faso', 'Cap-Vert', "Côte d'Ivoire", 'Gambie',
  'Ghana', 'Guinée', 'Guinée-Bissau', 'Liberia', 'Mali',
  'Niger', 'Nigeria', 'Sénégal', 'Sierra Leone', 'Togo',
]);

// Liste pays (FR) - source : norme ISO 3166-1 traduite
const PAYS_MONDE: string[] = [
  'Afghanistan', 'Afrique du Sud', 'Albanie', 'Algérie', 'Allemagne', 'Andorre', 'Angola',
  'Antigua-et-Barbuda', 'Arabie saoudite', 'Argentine', 'Arménie', 'Australie', 'Autriche',
  'Azerbaïdjan', 'Bahamas', 'Bahreïn', 'Bangladesh', 'Barbade', 'Belgique', 'Belize',
  'Bénin', 'Bhoutan', 'Biélorussie', 'Birmanie', 'Bolivie', 'Bosnie-Herzégovine',
  'Botswana', 'Brésil', 'Brunei', 'Bulgarie', 'Burkina Faso', 'Burundi', 'Cambodge',
  'Cameroun', 'Canada', 'Cap-Vert', 'Chili', 'Chine', 'Chypre', 'Colombie', 'Comores',
  'Congo', 'Corée du Nord', 'Corée du Sud', 'Costa Rica', "Côte d'Ivoire", 'Croatie',
  'Cuba', 'Danemark', 'Djibouti', 'Dominique', 'Égypte', 'Émirats arabes unis', 'Équateur',
  'Érythrée', 'Espagne', 'Estonie', 'Eswatini', 'États-Unis', 'Éthiopie', 'Fidji',
  'Finlande', 'France', 'Gabon', 'Gambie', 'Géorgie', 'Ghana', 'Grèce', 'Grenade',
  'Guatemala', 'Guinée', 'Guinée équatoriale', 'Guinée-Bissau', 'Guyana', 'Haïti',
  'Honduras', 'Hongrie', 'Île Maurice', 'Îles Marshall', 'Îles Salomon', 'Inde',
  'Indonésie', 'Irak', 'Iran', 'Irlande', 'Islande', 'Israël', 'Italie', 'Jamaïque',
  'Japon', 'Jordanie', 'Kazakhstan', 'Kenya', 'Kirghizistan', 'Kiribati', 'Kosovo',
  'Koweït', 'Laos', 'Lesotho', 'Lettonie', 'Liban', 'Liberia', 'Libye', 'Liechtenstein',
  'Lituanie', 'Luxembourg', 'Macédoine du Nord', 'Madagascar', 'Malaisie', 'Malawi',
  'Maldives', 'Mali', 'Malte', 'Maroc', 'Mauritanie', 'Mexique', 'Micronésie', 'Moldavie',
  'Monaco', 'Mongolie', 'Monténégro', 'Mozambique', 'Namibie', 'Nauru', 'Népal',
  'Nicaragua', 'Niger', 'Nigeria', 'Norvège', 'Nouvelle-Zélande', 'Oman', 'Ouganda',
  'Ouzbékistan', 'Pakistan', 'Palaos', 'Palestine', 'Panama', 'Papouasie-Nouvelle-Guinée',
  'Paraguay', 'Pays-Bas', 'Pérou', 'Philippines', 'Pologne', 'Portugal', 'Qatar',
  'République centrafricaine', 'République démocratique du Congo', 'République dominicaine',
  'République tchèque', 'Roumanie', 'Royaume-Uni', 'Russie', 'Rwanda',
  'Saint-Christophe-et-Niévès', 'Sainte-Lucie', 'Saint-Marin',
  'Saint-Vincent-et-les-Grenadines', 'Salvador', 'Samoa', 'Sao Tomé-et-Principe',
  'Sénégal', 'Serbie', 'Seychelles', 'Sierra Leone', 'Singapour', 'Slovaquie', 'Slovénie',
  'Somalie', 'Soudan', 'Soudan du Sud', 'Sri Lanka', 'Suède', 'Suisse', 'Suriname',
  'Syrie', 'Tadjikistan', 'Taïwan', 'Tanzanie', 'Tchad', 'Thaïlande', 'Timor oriental',
  'Togo', 'Tonga', 'Trinité-et-Tobago', 'Tunisie', 'Turkménistan', 'Turquie', 'Tuvalu',
  'Ukraine', 'Uruguay', 'Vanuatu', 'Vatican', 'Venezuela', 'Vietnam', 'Yémen', 'Zambie',
  'Zimbabwe',
];

// Pays selectionnables : on retire les membres CEDEAO
const PAYS_HORS_CEDEAO = PAYS_MONDE
  .filter((p) => !CEDEAO.has(p))
  .sort((a, b) => a.localeCompare(b, 'fr'));

interface PaysSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function PaysSelect({
  values, onChange, label = 'Pays de destination',
  placeholder = 'Rechercher un pays…', disabled,
}: PaysSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer au clic exterieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAYS_HORS_CEDEAO;
    return PAYS_HORS_CEDEAO.filter((p) => p.toLowerCase().includes(q));
  }, [query]);

  const toggle = (pays: string) => {
    if (values.includes(pays)) onChange(values.filter((p) => p !== pays));
    else onChange([...values, pays].sort((a, b) => a.localeCompare(b, 'fr')));
  };

  const remove = (pays: string) => onChange(values.filter((p) => p !== pays));

  return (
    <div className="form-group" ref={containerRef}>
      <label className="text-sm font-semibold block mb-1">{label}</label>

      {/* Chips des pays selectionnes */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-900 rounded text-xs font-medium border border-orange-200"
            >
              {p}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(p)}
                  className="hover:text-orange-700"
                  aria-label={`Retirer ${p}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Champ de recherche */}
      <div className="relative">
        <div className="flex items-center border border-gray-300 rounded bg-white">
          <Search className="w-4 h-4 ml-2 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 px-2 py-1.5 text-sm bg-transparent outline-none disabled:opacity-50"
          />
        </div>

        {/* Liste deroulante */}
        {open && !disabled && (
          <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-500">Aucun pays trouvé.</p>
            ) : (
              filtered.map((p) => {
                const checked = values.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggle(p)}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:bg-gray-50 ${
                      checked ? 'bg-orange-50 font-medium text-orange-900' : 'text-gray-700'
                    }`}
                  >
                    <span>{p}</span>
                    {checked && <Check className="w-4 h-4 text-orange-600" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-1">
        {values.length} pays sélectionné(s). Les pays membres de la CEDEAO sont exclus de la liste.
      </p>
    </div>
  );
}
