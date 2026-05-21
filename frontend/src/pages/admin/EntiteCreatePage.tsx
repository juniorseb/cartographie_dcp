/**
 * Page admin de saisie ARTCI / edition d'entite.
 * Source de verite unique : MonEnregistrementPage en mode='admin'.
 *
 * URLs :
 * - /admin/entites/nouveau         -> creation (entiteId absent, saisi a la 1ere save)
 * - /admin/entites/:id/saisie      -> edition d'une entite existante via formulaire DCP
 */
import MonEnregistrementPage from '@/pages/entreprise/MonEnregistrementPage';

export default function EntiteCreatePage() {
  return <MonEnregistrementPage mode="admin" />;
}
