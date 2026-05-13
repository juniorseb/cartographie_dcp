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

  return (
    <div className="border border-gray-200 p-4 mb-3 bg-gray-50 rounded">
      <h4 className="font-bold text-sm uppercase mb-3 text-[var(--artci-green)]">{titre}</h4>

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
            {data.items_coches.includes('autre') && (
              <input
                type="text"
                value={data.item_autre ?? ''}
                onChange={(e) => update({ item_autre: e.target.value })}
                placeholder="Préciser..."
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
          <p className="text-xs font-semibold text-gray-700 mb-2">Durée de conservation (sur support informatique)</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={data.duree_jours ?? ''}
                onChange={(e) => update({ duree_jours: e.target.value })}
                className="text-xs w-16"
              />
              <span className="text-xs">jours</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={data.duree_mois ?? ''}
                onChange={(e) => update({ duree_mois: e.target.value })}
                className="text-xs w-16"
              />
              <span className="text-xs">mois</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={data.duree_annees ?? ''}
                onChange={(e) => update({ duree_annees: e.target.value })}
                className="text-xs w-16"
              />
              <span className="text-xs">années</span>
            </div>
            <input
              type="text"
              value={data.duree_autre ?? ''}
              onChange={(e) => update({ duree_autre: e.target.value })}
              placeholder="Autre (préciser)..."
              className="text-xs mt-1"
            />
          </div>
        </div>

        {/* Destinataires */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Destinataires (organismes auxquels les données sont transmises)</p>
          <textarea
            value={data.destinataires ?? ''}
            onChange={(e) => update({ destinataires: e.target.value })}
            rows={4}
            className="text-xs"
          />
        </div>
      </div>
    </div>
  );
}
