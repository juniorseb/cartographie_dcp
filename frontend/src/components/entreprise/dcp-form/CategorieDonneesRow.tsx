/**
 * Composant pour saisir une catégorie de données (Détail / Origine / Durée / Destinataires).
 * Utilisé pour chacune des 13 catégories du questionnaire officiel.
 */
import type { CategorieDonneesDetail } from '@/types/formulaire-dcp';

interface Props {
  titre: string;
  itemsDisponibles: { value: string; label: string }[];
  origineOptions: { value: string; label: string }[];
  detail: CategorieDonneesDetail | undefined;
  onChange: (v: CategorieDonneesDetail) => void;
  hasIndirectPrecision?: boolean;
}

export default function CategorieDonneesRow({
  titre,
  itemsDisponibles,
  origineOptions,
  detail,
  onChange,
  hasIndirectPrecision = true,
}: Props) {
  const data: CategorieDonneesDetail = detail ?? {
    items_coches: [],
    origine: [],
  };

  function update(patch: Partial<CategorieDonneesDetail>) {
    onChange({ ...data, ...patch });
  }

  function toggleItem(value: string) {
    const items = data.items_coches.includes(value)
      ? data.items_coches.filter((x) => x !== value)
      : [...data.items_coches, value];
    update({ items_coches: items });
  }

  function toggleOrigine(value: string) {
    const ori = data.origine.includes(value)
      ? data.origine.filter((x) => x !== value)
      : [...data.origine, value];
    update({ origine: ori });
  }

  const dureeUnites = data.duree_unites ?? [];
  function toggleUnite(value: string) {
    const unites = dureeUnites.includes(value)
      ? dureeUnites.filter((x) => x !== value)
      : [...dureeUnites, value];
    update({ duree_unites: unites });
  }

  const isNA = Boolean(data.non_applicable);

  return (
    <div className="border border-gray-200 p-4 mb-3 bg-gray-50 rounded">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h4 className="font-bold text-sm uppercase text-[var(--artci-green)]">{titre}</h4>
        {/* Spec B11 : toggle N/A pour la categorie entiere */}
        <label className="flex items-center gap-2 text-xs cursor-pointer text-gray-700 bg-white border border-gray-300 rounded px-2 py-1">
          <input
            type="checkbox"
            checked={isNA}
            onChange={(e) => update({
              non_applicable: e.target.checked,
              // Quand l'utilisateur coche N/A on vide les autres champs pour
              // eviter de garder des donnees fantomes (et qu'elles polluent
              // l'algorithme determinerFormalite cote partie 3).
              items_coches: e.target.checked ? [] : data.items_coches,
              origine: e.target.checked ? [] : data.origine,
              duree_unites: e.target.checked ? [] : data.duree_unites,
              destinataires: e.target.checked ? '' : data.destinataires,
              destinataires_non_applicable: e.target.checked ? true : data.destinataires_non_applicable,
            })}
          />
          <span>N/A — cette catégorie ne s'applique pas</span>
        </label>
      </div>

      {/* Sous-champs masques quand la categorie est marquee N/A */}
      {isNA ? (
        <p className="text-xs italic text-gray-500">
          Cette catégorie de données n'est pas traitée par votre organisation.
        </p>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Détail */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Détail (cocher les données traitées)</p>
          <div className="space-y-1">
            {itemsDisponibles.map((it) => (
              <label key={it.value} className="flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.items_coches.includes(it.value)}
                  onChange={() => toggleItem(it.value)}
                  className="mt-0.5"
                />
                <span>{it.label}</span>
              </label>
            ))}
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={data.items_coches.includes('autre')}
                onChange={() => toggleItem('autre')}
                className="mt-0.5"
              />
              <span>Autre (préciser)</span>
            </label>
            <p className="text-[11px] text-gray-500 italic leading-snug">
              Cochez « Autre » pour toute donnée de cette catégorie non listée ci-dessus
              (ex. : un champ spécifique à votre activité), puis précisez-en la nature.
            </p>
            {data.items_coches.includes('autre') && (
              <input
                type="text"
                value={data.item_autre ?? ''}
                onChange={(e) => update({ item_autre: e.target.value })}
                placeholder="Préciser la donnée concernée..."
                className="text-xs mt-1"
              />
            )}
          </div>
        </div>

        {/* Origine */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Origine (comment collecté ?)</p>
          <div className="space-y-1">
            {origineOptions.map((o) => (
              <label key={o.value} className="flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.origine.includes(o.value)}
                  onChange={() => toggleOrigine(o.value)}
                  className="mt-0.5"
                />
                <span>{o.label}</span>
              </label>
            ))}
            {hasIndirectPrecision && data.origine.includes('indirectement') && (
              <input
                type="text"
                value={data.origine_indirect_precision ?? ''}
                onChange={(e) => update({ origine_indirect_precision: e.target.value })}
                placeholder="Préciser..."
                className="text-xs mt-1"
              />
            )}
          </div>
        </div>

        {/* Durée de conservation */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Durée de conservation</p>
          <p className="text-[11px] text-gray-500 italic mb-2 leading-snug">
            Cochez la ou les unités applicables, puis indiquez la durée pour chaque unité cochée.
          </p>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={dureeUnites.includes('jours')} onChange={() => toggleUnite('jours')} />
              <span>Jours</span>
            </label>
            {dureeUnites.includes('jours') && (
              <input
                type="number"
                min={0}
                value={data.duree_jours ?? ''}
                onChange={(e) => update({ duree_jours: e.target.value })}
                placeholder="Nombre de jours"
                className="text-xs w-full mb-1"
              />
            )}

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={dureeUnites.includes('mois')} onChange={() => toggleUnite('mois')} />
              <span>Mois</span>
            </label>
            {dureeUnites.includes('mois') && (
              <input
                type="number"
                min={0}
                value={data.duree_mois ?? ''}
                onChange={(e) => update({ duree_mois: e.target.value })}
                placeholder="Nombre de mois"
                className="text-xs w-full mb-1"
              />
            )}

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={dureeUnites.includes('annees')} onChange={() => toggleUnite('annees')} />
              <span>Années</span>
            </label>
            {dureeUnites.includes('annees') && (
              <input
                type="number"
                min={0}
                value={data.duree_annees ?? ''}
                onChange={(e) => update({ duree_annees: e.target.value })}
                placeholder="Nombre d'années"
                className="text-xs w-full mb-1"
              />
            )}

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={dureeUnites.includes('autre')} onChange={() => toggleUnite('autre')} />
              <span>Autre</span>
            </label>
            {dureeUnites.includes('autre') && (
              <input
                type="text"
                value={data.duree_autre ?? ''}
                onChange={(e) => update({ duree_autre: e.target.value })}
                placeholder="Préciser la durée..."
                className="text-xs w-full"
              />
            )}
          </div>
        </div>

        {/* Destinataires */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Destinataires (organismes auxquels les données sont transmises)</p>
          <label className="flex items-center gap-2 text-xs cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={data.destinataires_non_applicable ?? false}
              onChange={(e) => update({
                destinataires_non_applicable: e.target.checked,
                destinataires: e.target.checked ? '' : data.destinataires,
              })}
            />
            <span>Non applicable (aucun destinataire externe)</span>
          </label>
          {!data.destinataires_non_applicable && (
            <textarea
              value={data.destinataires ?? ''}
              onChange={(e) => update({ destinataires: e.target.value })}
              rows={3}
              className="text-xs"
            />
          )}
        </div>
      </div>
      )}
    </div>
  );
}
