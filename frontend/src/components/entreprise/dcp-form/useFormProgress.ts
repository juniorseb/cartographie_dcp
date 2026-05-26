/**
 * Hook : calcul d'avancement du formulaire DCP avec saut des questions
 * non-applicables (conditional). Pour chaque question, on regarde si elle
 * doit apparaitre dans l'UI et seulement alors on l'inclut dans le total.
 */
import { useMemo } from 'react';
import type { FormulaireDCP } from '@/types/formulaire-dcp';

interface ProgressResult {
  /** Nombre total de questions applicables. */
  total: number;
  /** Nombre de questions applicables remplies. */
  filled: number;
  /** Pourcentage entier 0..100. */
  percent: number;
  /** Decoupe par partie (1..5). */
  parts: { num: number; total: number; filled: number; percent: number }[];
}

function isFilled(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return true;
}

export function useFormProgress(form: FormulaireDCP): ProgressResult {
  return useMemo(() => {
    const id = form.identification ?? {};
    const cj = form.cadre_juridique ?? {};
    const reg = form.registre ?? {};
    const st = form.sous_traitance_transferts ?? {};
    const sec = form.securite ?? {};

    // Helper : ajoute une question si applicable
    const acc = (questions: { applicable: boolean; value: unknown }[]) => {
      const applicables = questions.filter((q) => q.applicable);
      const filled = applicables.filter((q) => isFilled(q.value)).length;
      return { total: applicables.length, filled };
    };

    // ----- PARTIE 1 -----
    const part1 = acc([
      { applicable: true, value: id.statut_juridique },
      { applicable: id.statut_juridique === 'pm_droit_prive' || id.statut_juridique === 'pm_droit_public', value: id.personne_morale?.denomination_officielle },
      { applicable: id.statut_juridique === 'pm_droit_prive' || id.statut_juridique === 'pm_droit_public', value: id.personne_morale?.numero_cc },
      { applicable: id.statut_juridique === 'personne_physique', value: id.personne_physique?.nom_prenom },
      { applicable: true, value: id.secteurs_activite },
      { applicable: !!id.secteurs_activite?.includes('Autre'), value: id.secteur_autre },
      { applicable: true, value: id.volume_donnees },
      { applicable: true, value: id.responsable_legal?.nom_prenom },
      { applicable: true, value: id.responsable_legal?.email },
      { applicable: true, value: id.localisation?.latitude },
    ]);

    // ----- PARTIE 2 -----
    const part2 = acc([
      { applicable: true, value: cj.connaissance_loi_2013 },
      { applicable: true, value: cj.connaissance_obligations },
      { applicable: true, value: cj.connaissance_artci },
      { applicable: true, value: cj.dpo_habilite },
      { applicable: cj.dpo_habilite === 'oui', value: cj.dpo_type },
      { applicable: cj.dpo_type === 'externe', value: cj.dpo_externe_type },
      { applicable: cj.dpo_habilite === 'oui' && (cj.dpo_type === 'interne' || cj.dpo_externe_type === 'physique'), value: cj.dpo_physique?.nom_prenom },
      { applicable: cj.dpo_habilite === 'oui' && cj.dpo_externe_type === 'morale', value: cj.dpo_morale?.nom_structure },
      { applicable: cj.dpo_habilite === 'oui', value: cj.dpo_courrier_habilitation_uploaded },
    ]);

    // ----- PARTIE 3 -----
    const part3 = acc([
      // Q "distinction declaration/autorisation" supprimee (spec B6) — n'est
      // donc plus comptee dans la progression (sinon le formulaire plafonnait
      // a 98% car la valeur ne pouvait plus etre renseignee).
      { applicable: true, value: reg.activites_traitement },
      { applicable: true, value: reg.registre_tenu },
      { applicable: reg.registre_tenu === 'oui', value: reg.forme_registre },
      { applicable: true, value: reg.categories_personnes },
      { applicable: true, value: reg.categories_donnees },
      { applicable: true, value: st.suppression_anonymisation },
      { applicable: true, value: reg.finalites },
      { applicable: true, value: cj.formalites_effectuees },
      { applicable: cj.formalites_effectuees === 'en_cours', value: cj.stades_demarche },
      { applicable: cj.formalites_effectuees === 'en_cours', value: cj.accompagnement_externe },
      { applicable: cj.accompagnement_externe === 'oui', value: cj.accompagnement_qui },
      { applicable: cj.formalites_effectuees === 'non_aucune', value: cj.raisons_non_formalites },
      { applicable: true, value: reg.bases_legales },
      { applicable: true, value: reg.mode_traitement },
      { applicable: true, value: reg.info_personnes_collecte },
      { applicable: true, value: reg.infos_communiquees },
      { applicable: true, value: reg.comment_informer },
      { applicable: true, value: reg.reutilisation_donnees },
    ]);

    // ----- PARTIE 4 -----
    const part4 = acc([
      { applicable: true, value: st.recours_sous_traitants },
      { applicable: st.recours_sous_traitants === 'oui', value: st.nombre_sous_traitants },
      { applicable: st.recours_sous_traitants === 'oui', value: st.contrats_sous_traitance_existence },
      { applicable: st.contrats_sous_traitance_existence === 'oui', value: st.nombre_contrats_sous_traitance },
      { applicable: st.contrats_sous_traitance_existence === 'oui', value: st.pays_sous_traitants },
      { applicable: st.contrats_sous_traitance_existence === 'oui', value: st.clauses_obligatoires },
      { applicable: true, value: st.transfert_hors_cedeao },
      { applicable: st.transfert_hors_cedeao === 'oui', value: st.pays_transferts },
      { applicable: st.transfert_hors_cedeao === 'oui', value: st.objet_transfert },
      { applicable: st.transfert_hors_cedeao === 'oui', value: st.autorisation_artci_transfert },
      { applicable: st.transfert_hors_cedeao === 'oui', value: st.bases_juridiques_transfert },
      { applicable: st.transfert_hors_cedeao === 'oui', value: st.garanties_transfert },
    ]);

    // ----- PARTIE 5 -----
    const part5 = acc([
      { applicable: true, value: sec.politique_securite },
      { applicable: true, value: st.protection_supports },
      { applicable: sec.politique_securite === 'oui_formalisee', value: sec.charte_uploaded },
      { applicable: true, value: sec.mesures_techniques_list },
      { applicable: true, value: sec.mesures_organisationnelles_list },
      { applicable: true, value: sec.violation_12mois },
      { applicable: sec.violation_12mois === 'oui', value: sec.notification_artci },
      { applicable: sec.violation_12mois === 'oui', value: sec.info_personnes_violation },
      { applicable: true, value: sec.registre_violations },
      { applicable: true, value: sec.procedures_violation },
      { applicable: true, value: sec.personnel_sensibilise },
    ]);

    const all = [part1, part2, part3, part4, part5];
    const total = all.reduce((s, p) => s + p.total, 0);
    const filled = all.reduce((s, p) => s + p.filled, 0);
    const percent = total === 0 ? 0 : Math.round((filled / total) * 100);

    return {
      total,
      filled,
      percent,
      parts: all.map((p, i) => ({
        num: i + 1,
        total: p.total,
        filled: p.filled,
        percent: p.total === 0 ? 0 : Math.round((p.filled / p.total) * 100),
      })),
    };
  }, [form]);
}
