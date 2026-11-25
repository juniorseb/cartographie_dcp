"""
Conversion d'une ligne du questionnaire de recensement (export BoloForms /
Google Forms / Excel ARTCI, 171 colonnes) vers la structure JSON du
formulaire DCP de la plateforme (`FormulaireDCP.reponses`).

Pourquoi : l'import historique (import_boloforms_service) ne remplissait que
les tables normalisees (entites_*, registre_traitements, ...) sous forme de
texte libre. Le formulaire affiche aux admins et aux entreprises lit
exclusivement `FormulaireDCP.reponses` : les entites importees apparaissaient
donc avec un formulaire vide (0/33 questions).

Principe : les libelles du questionnaire source sont IDENTIQUES a ceux du
formulaire de la plateforme (cf. frontend/src/components/entreprise/dcp-form
/categories-donnees-config.ts). On mappe donc par libelle exact (insensible a
la casse, aux accents et aux apostrophes typographiques). Une reponse non
reconnue n'est jamais devinee : elle est laissee vide ou rangee dans le champ
« autre » prevu par le formulaire.

Structure cible : voir frontend/src/types/formulaire-dcp.ts.
"""
import re
import unicodedata
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Normalisation texte
# ---------------------------------------------------------------------------

def _norm(s: Optional[str]) -> str:
    """minuscules, sans accents, apostrophes/espaces normalises."""
    if not s:
        return ''
    s = str(s).replace('’', "'").replace('‘', "'").replace(' ', ' ')
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', s).strip().lower()


def _cell(row: List[str], idx: int) -> Optional[str]:
    """Cellule 1-based, None si vide ou '-'."""
    if idx > len(row):
        return None
    v = row[idx - 1]
    if v is None:
        return None
    v = str(v).strip()
    return v if v and v != '-' else None


def _oui_non(v: Optional[str]) -> Optional[str]:
    n = _norm(v)
    if not n:
        return None
    if n.startswith('oui'):
        return 'oui'
    if n.startswith('non'):
        return 'non'
    return None


def _pick(v: Optional[str], regles: List[tuple]) -> Optional[str]:
    """Premiere regle (mot-cle, code) dont le mot-cle est contenu dans la reponse."""
    n = _norm(v)
    if not n:
        return None
    for mot, code in regles:
        if _norm(mot) in n:
            return code
    return None


def _multi(v: Optional[str], options: List[tuple]) -> List[str]:
    """Liste des codes dont le libelle (ou mot-cle) apparait dans la reponse."""
    n = _norm(v)
    if not n:
        return []
    out = []
    for mot, code in options:
        if _norm(mot) in n and code not in out:
            out.append(code)
    return out


def _reste(v: Optional[str], libelles: List[str]) -> str:
    """Texte restant une fois retires les libelles reconnus (pour le champ « autre »)."""
    n = _norm(v)
    for lib in sorted(list(libelles) + ['non applicable'], key=len, reverse=True):
        n = n.replace(_norm(lib), ' ')
    n = re.sub(r'[\s,;/]+', ' ', n).strip()
    return n


# ---------------------------------------------------------------------------
# Referentiels (copies exactes des libelles du formulaire)
# ---------------------------------------------------------------------------

SECTEURS = [
    ('Banque, Finance', ['Banque / Microfinance', 'Finance / Marché des capitaux']),
    ('Fintech', ['Banque / Microfinance']),
    ('Télécommunications', ['Télécommunications / TIC']),
    ('Assurance', ['Assurance']),
    ('Énergie', ['Énergie / Mines / Pétrole']),
    ('Commerce', ['Commerce / Distribution']),
    ('Santé', ['Santé / Médical']),
    ('Transports', ['Transport / Logistique']),
    ('Éducation', ['Éducation / Formation']),
    ('Administration publique', ['Administration publique']),
    ('Agriculture', ['Agriculture / Agro-industrie']),
    ('Communication', ['Médias / Communication / Publicité']),
    ('Urbanisme', ['Immobilier']),
]

REGIONS = [
    'Abidjan', 'Yamoussoukro', 'Bas-Sassandra', 'Comoé', 'Denguélé', 'Gôh-Djiboua',
    'Lacs', 'Lagunes', 'Montagnes', 'Sassandra-Marahoué', 'Savanes',
    'Vallée du Bandama', 'Woroba', 'Zanzan',
]
COMMUNES = {
    'Abidjan': ['Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody', 'Koumassi',
                'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon', 'Songon', 'Brofodoumé'],
    'Comoé': ['Abengourou', 'Aboisso', 'Adiaké', 'Agnibilékrou', 'Grand-Bassam', 'Bonoua', 'Ayamé'],
}

CATEGORIES_PERSONNES = [
    ('Salariés/Agents', 'salaries_agents'), ('Candidats/Stagiaires', 'candidats_stagiaires'),
    ('Clients/Abonnés', 'clients_abonnes'), ('Prospects', 'prospects'),
    ('Usagers/Citoyens', 'usagers_citoyens'), ('Patients', 'patients'),
    ('Étudiants/Élèves', 'etudiants_eleves'), ('Fournisseurs/Partenaires', 'fournisseurs_partenaires'),
    ('Visiteurs', 'visiteurs'), ('Adhérents/Membres', 'adherents_membres'),
]

# 13 categories de donnees : (cle, col_detail, col_origine, col_si_indirect|None, col_duree, col_dest, items, origines)
_ORIG_STD = [('Directement auprès de la personne concernée', 'directement'), ('Indirectement', 'indirectement')]
CATEGORIES_DONNEES = [
    ('identification', 63, 64, 65, 66, 67, [
        ('Nom, prénom(s)', 'nom_prenom'), ('Adresse postale', 'adresse_postale'),
        ('Date et lieu de naissance', 'date_lieu_naissance'), ('Sexe', 'sexe'),
        ('Photographie', 'photographie'), ('Vidéo', 'video'), ('Numéro de téléphone', 'numero_telephone'),
        ('Adresse email', 'adresse_email'), ('Signature manuscrite', 'signature_manuscrite')], _ORIG_STD),
    ('numeros_officiels', 68, 69, 70, 71, 72, [
        ('CNI', 'cni'), ("Numéro d'Identifiant fiscal Unique (NIU)", 'niu'), ('NIU', 'niu'), ('CMU', 'cmu'),
        ('Passeport', 'passeport'), ('Titre de séjour', 'titre_sejour'), ('Permis de conduire', 'permis_conduire'),
        ('N° Sécurité sociale', 'n_securite_sociale'), ('Numéro de sécurité sociale', 'n_securite_sociale'),
        ('Matricule employé', 'matricule_employe')], _ORIG_STD),
    ('vie_personnelle', 73, 74, 75, 76, 77, [
        ('Situation familiale', 'situation_familiale'), ("Nombre d'enfants", 'nombre_enfants'),
        ('Habitudes de vie', 'habitudes_vie'), ("Loisirs / centres d'intérêt", 'loisirs')], _ORIG_STD),
    ('vie_professionnelle', 78, 79, 80, 81, 82, [
        ('CV / parcours professionnel', 'cv_parcours'), ('Diplômes et formations', 'diplomes_formations'),
        ('Fonction / poste occupé', 'fonction_poste'), ('Évaluations professionnelles', 'evaluations_professionnelles'),
        ('Distinctions', 'distinctions')], _ORIG_STD),
    ('economique_financiere', 83, 84, 85, 86, 87, [
        ('Revenus / salaires', 'revenus_salaires'), ('Situation financière', 'situation_financiere'),
        ('Coordonnées bancaires (IBAN/RIB)', 'coordonnees_bancaires'), ('Moyens de paiement', 'moyens_paiement'),
        ('Historique des transactions', 'historique_transactions')], _ORIG_STD),
    ('connexion_navigation', 88, 89, 90, 91, 92, [
        ('Adresse IP', 'adresse_ip'), ('Logs de connexion', 'logs_connexion'),
        ('Identifiants (login/mot de passe)', 'identifiants'), ('Cookies', 'cookies'), ('Horodatage', 'horodatage')],
        [('Collecte automatique', 'collecte_automatique'), ('Indirectement', 'indirectement')]),
    ('localisation', 93, 94, None, 95, 96, [
        ('Données GPS', 'gps'), ('Localisation GSM/GPRS', 'gsm_gprs'), ('Adresse MAC', 'mac'),
        ('Historique des déplacements', 'historique_deplacements')],
        [('Collecte automatique', 'collecte_automatique'), ('Via terminal mobile', 'terminal_mobile'), ('Autre', 'autre')]),
    ('sante', 97, 98, 99, 100, 101, [
        ('Pathologies / affections', 'pathologies'), ('Antécédents médicaux', 'antecedents_medicaux'),
        ('Données relatives aux soins', 'donnees_soins'), ('Situations ou comportements à risques', 'situations_risques'),
        ('Handicap', 'handicap')],
        [('Directement auprès de la personne concernée', 'directement'), ('Via un professionnel de santé', 'professionnel_sante'),
         ('Indirectement', 'indirectement')]),
    ('biometriques', 102, 103, 104, 105, 106, [
        ('Empreintes digitales', 'empreintes_digitales'), ('Reconnaissance faciale', 'reconnaissance_faciale'),
        ("Reconnaissance de l'iris", 'reconnaissance_iris'), ('Contour de la main', 'contour_main'),
        ('Réseau veineux', 'reseau_veineux'), ('Reconnaissance vocale', 'reconnaissance_vocale')],
        [('Directement auprès de la personne concernée', 'directement'), ('Collecte directe', 'directement'),
         ('Via dispositif biométrique', 'dispositif_biometrique'), ('Indirectement', 'indirectement')]),
    ('genetiques', 107, 108, 109, 110, 111, [('ADN', 'adn'), ('Profil génétique', 'profil_genetique')],
        [('Directement auprès de la personne concernée', 'directement'), ('Via un laboratoire habilité', 'laboratoire'),
         ('Indirectement', 'indirectement')]),
    ('autres_sensibles', 112, 113, 114, 115, 116, [
        ('Origines raciales ou ethniques', 'origines_raciales'), ('Opinions politiques', 'opinions_politiques'),
        ('Opinions philosophiques', 'opinions_philosophiques'), ('Convictions religieuses', 'convictions_religieuses'),
        ('Appartenance syndicale', 'appartenance_syndicale'), ('Vie sexuelle', 'vie_sexuelle')],
        [('Déclaration de la personne concernée', 'declaration'), ('Directement auprès de la personne concernée', 'declaration'),
         ('Indirectement', 'indirectement')]),
    ('judiciaires', 117, 118, 119, 120, 121, [
        ('Infractions', 'infractions'), ('Condamnations', 'condamnations'), ('Mesures de sûreté', 'mesures_surete')],
        [('Autorités judiciaires', 'autorites_judiciaires'), ('Directement auprès de la personne concernée', 'directement'),
         ('Indirectement', 'indirectement')]),
    ('sociales', 122, 123, 124, 125, 126, [
        ('Appréciations sur les difficultés sociales des personnes', 'difficultes_sociales'),
        ('Appréciations sur les difficultés sociales', 'difficultes_sociales')],
        [('Directement auprès de la personne concernée', 'directement'), ('Services sociaux', 'services_sociaux'),
         ('Indirectement', 'indirectement')]),
]

_NA = {'non applicable', 'n/a', 'na', 'aucune', 'aucun', 'neant', 'nan'}


def _duree(v: Optional[str]) -> Dict[str, Any]:
    """'10A' / '10 ans' -> annees ; '3M' -> mois ; '30J' -> jours ; sinon texte libre (autre)."""
    if not v:
        return {}
    n = _norm(v)
    if n in _NA:
        return {}
    m = re.fullmatch(r'(\d+)\s*(a|an|ans|annee|annees|m|mois|j|jour|jours)', n)
    if m:
        nb, u = m.group(1), m.group(2)
        if u.startswith('a'):
            return {'duree_unites': ['annees'], 'duree_annees': nb}
        if u.startswith('m'):
            return {'duree_unites': ['mois'], 'duree_mois': nb}
        return {'duree_unites': ['jours'], 'duree_jours': nb}
    return {'duree_unites': ['autre'], 'duree_autre': str(v).strip()[:500]}


def _categorie(row, col_detail, col_orig, col_ind, col_duree, col_dest, items, origines) -> Dict[str, Any]:
    detail = _cell(row, col_detail)
    if not detail or _norm(detail) in _NA:
        return {'non_applicable': True, 'items_coches': [], 'origine': [], 'destinataires_non_applicable': True}
    coches = _multi(detail, items)
    out: Dict[str, Any] = {'items_coches': coches, 'origine': _multi(_cell(row, col_orig), origines)}
    reste = _reste(detail, [lib for lib, _ in items])
    if reste and len(reste) > 2:
        out['items_coches'] = coches + ['autre']
        out['item_autre'] = detail if not coches else reste[:500]
    if col_ind:
        ind = _cell(row, col_ind)
        if ind and _norm(ind) not in _NA:
            out['origine_indirect_precision'] = ind[:500]
    out.update(_duree(_cell(row, col_duree)))
    dest = _cell(row, col_dest)
    if dest and _norm(dest) not in _NA:
        out['destinataires'] = dest[:1000]
    elif dest:
        out['destinataires_non_applicable'] = True
    return out


def _secteurs(v: Optional[str]) -> List[str]:
    # Mot entier uniquement : « communication » ne doit pas matcher « telecommunications ».
    out: List[str] = []
    n = _norm(v)
    for mot, codes in SECTEURS:
        if re.search(r'(?<![a-z])' + re.escape(_norm(mot)), n):
            for c in codes:
                if c not in out:
                    out.append(c)
    return out


def _region(v: Optional[str]) -> Optional[str]:
    n = _norm(v)
    if not n:
        return None
    for r in REGIONS:
        if _norm(r) in n:
            return r
    return None


def _commune(v: Optional[str], region: Optional[str]) -> Optional[str]:
    n = _norm(v).replace(' ', '-')
    if not n:
        return None
    for c in COMMUNES.get(region or '', []) + [c for lst in COMMUNES.values() for c in lst]:
        if _norm(c).replace(' ', '-') == n:
            return c
    return None


def _float(v: Optional[str]) -> Optional[float]:
    if not v:
        return None
    try:
        return float(str(v).replace(',', '.'))
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Construction des reponses
# ---------------------------------------------------------------------------

def build_reponses_from_row(row: List[str], numero_cc: Optional[str] = None) -> Dict[str, Any]:
    """Construit `FormulaireDCP.reponses` a partir d'une ligne du questionnaire (171 colonnes)."""
    c = lambda i: _cell(row, i)  # noqa: E731

    # ----- Partie 1 : identification -----
    statut = _pick(c(6), [('droit public', 'pm_droit_public'), ('droit prive', 'pm_droit_prive'),
                          ('personne physique', 'personne_physique')])
    region = _region(c(23)) or _region(c(163))
    ident: Dict[str, Any] = {
        'statut_juridique': statut,
        'secteurs_activite': _secteurs(c(7)),
        'volume_donnees': _pick(c(9), [('moins de 1', 'moins_1000'), ('plus de 100', 'plus_100000'),
                                       ('001 a 100', '10000_100000'), ('001 a 10', '1000_10000')]),
        'responsable_legal': {k: v for k, v in {
            'nom_prenom': c(10), 'fonction': c(11), 'email': c(12), 'telephone': c(13),
        }.items() if v},
    }
    if not ident['secteurs_activite'] and c(7):
        ident['secteurs_activite'] = ['Autre']
        ident['secteur_autre'] = c(7)
    if statut == 'personne_physique':
        ident['personne_physique'] = {k: v for k, v in {
            'nom_prenom': c(29), 'fonction': c(30), 'adresse': c(31), 'ville': c(32),
            'commune': _commune(c(33), region), 'region': region,
        }.items() if v}
    else:
        ident['personne_morale'] = {k: v for k, v in {
            'denomination_officielle': c(17), 'raison_sociale': c(18) or c(17),
            'numero_cc': numero_cc or c(19), 'adresse_siege': c(20), 'ville': c(21),
            'commune': _commune(c(22), region), 'region': region,
        }.items() if v}
    lat, lng = _float(c(25)) or _float(c(36)), _float(c(24)) or _float(c(35))
    if lat is not None and lng is not None:
        ident['localisation'] = {'latitude': lat, 'longitude': lng}

    # ----- Partie 2 : cadre juridique -----
    cadre: Dict[str, Any] = {
        'connaissance_loi_2013': _oui_non(c(41)),
        'connaissance_obligations': _oui_non(c(42)),
        'connaissance_artci': _pick(c(43), [('partiellement', 'partiellement'), ('oui', 'oui'), ('non', 'non')]),
        # Seul « Oui, habilite » vaut habilitation ARTCI ; « Designe » / « En cours » = non habilite.
        'dpo_habilite': 'oui' if 'habil' in _norm(c(44)) else ('non' if c(44) else None),
        'cpd_profil_requis': _pick(c(50), [('ne sais pas', 'ne_sais_pas'), ('oui', 'oui'), ('non', 'non')]),
        'distinction_decl_aut': _pick(c(51), [('incertain', 'incertain'), ('oui', 'oui'), ('non', 'non')]),
        'formalites_effectuees': _pick(c(52), [('en cours', 'en_cours'), ('oui', 'oui_tous'), ('non', 'non_aucune')]),
        'accompagnement_externe': _oui_non(c(54)),
    }
    dpo_type = _pick(c(49), [('externe', 'externe'), ('interne', 'interne')])
    if dpo_type:
        cadre['dpo_type'] = dpo_type
        if dpo_type == 'externe':
            cadre['dpo_externe_type'] = 'physique'
    dpo = {k: v for k, v in {'nom_prenom': c(45), 'email': c(46), 'telephone': c(47),
                             'date_designation': c(48)}.items() if v}
    if dpo:
        cadre['dpo_physique'] = dpo
    stades = _multi(c(53), [('audit', 'audit_initial'), ('registre', 'elaboration_registre'),
                            ('mesures techniques', 'mesures_techniques_org'), ('depot', 'depot_declarations'),
                            ('formation', 'formation_personnel'), ('finalisation', 'finalisation_suivi')])
    if stades:
        cadre['stades_demarche'] = stades
    if c(55):
        cadre['accompagnement_qui'] = c(55)
    raisons_lib = [('Ignorance de l', 'ignorance_obligation'), ('Complexit', 'complexite_procedure'),
                   ('Coût', 'cout_eleve'), ('Manque de temps', 'manque_temps_ressources'), ('exempt', 'pense_exempte')]
    raisons = _multi(c(56), raisons_lib)
    if c(56):
        reste = _reste(c(56), ["Ignorance de l'obligation", 'Complexité de la procédure', 'Coût élevé',
                               'Manque de temps/ressources', 'Pense être exempté'])
        if reste and len(reste) > 2:
            raisons.append('autre')
            cadre['raison_autre_precision'] = c(56)
        cadre['raisons_non_formalites'] = raisons
    if c(57):
        cadre['raison_exempte_precision'] = c(57)

    # ----- Partie 3 : registre et traitements -----
    cats_personnes = _multi(c(60), CATEGORIES_PERSONNES)
    reste_cp = _reste(c(60), [lib for lib, _ in CATEGORIES_PERSONNES])
    registre: Dict[str, Any] = {
        'registre_tenu': _pick(c(58), [('en cours', 'en_cours'), ('incomplet', 'oui_incomplet'),
                                       ('complet', 'oui_complet'), ('oui', 'oui'), ('non', 'non')]),
        'categories_personnes': cats_personnes + (['autre'] if reste_cp and len(reste_cp) > 2 else []),
        'categories_donnees': {
            key: _categorie(row, cd, co, ci, cdu, cde, items, origines)
            for key, cd, co, ci, cdu, cde, items, origines in CATEGORIES_DONNEES
        },
        'finalite_explicite': _pick(c(128), [('preciser', 'a_preciser'), ('oui', 'oui'), ('non', 'non')]),
        'mode_traitement': _pick(c(131), [('mixte', 'mixte'), ('automatis', 'automatise'), ('manuel', 'manuel')]),
        'info_personnes_collecte': _pick(c(132), [('systematique', 'oui_systematiquement'), ('parfois', 'parfois'),
                                                  ('non', 'non')]),
        'reutilisation_donnees': _oui_non(c(135)),
    }
    if reste_cp and len(reste_cp) > 2:
        registre['categorie_personne_autre'] = c(60)
    forme = _pick(c(59), [('tableur', 'tableur'), ('excel', 'tableur'), ('base de donnees', 'base_donnees'),
                          ('logiciel', 'logiciel'), ('plateforme', 'logiciel'), ('papier', 'papier')])
    if forme:
        registre['forme_registre'] = forme
    elif c(59):
        registre['forme_registre'] = 'autre'
        registre['forme_registre_autre'] = c(59)
    finalites_lib = [('Gestion administrative', 'gestion_administrative'), ('ressources humaines', 'gestion_rh'),
                     ('client', 'gestion_clientele'), ('marketing', 'marketing_prospection'),
                     ('prospection', 'marketing_prospection'), ('Suivi médical', 'suivi_medical_social'),
                     ('Recherche', 'recherche_statistiques'), ('statistiques', 'recherche_statistiques'),
                     ('Sécurité / contrôle', 'securite_controle_acces'), ("contrôle d'accès", 'securite_controle_acces')]
    finalites = _multi(c(127), finalites_lib)
    reste_f = _reste(c(127), ['Gestion administrative', 'Gestion des ressources humaines',
                              'Gestion de la clientèle / usagers', 'Marketing / prospection',
                              'Suivi médical / social', 'Recherche / statistiques',
                              "Sécurité / contrôle d'accès"])
    if reste_f and len(reste_f) > 2:
        finalites.append('autre')
        registre['finalite_autre_precision'] = c(127)
    registre['finalites'] = finalites
    registre['bases_legales'] = _multi(c(129), [
        ('Consentement', 'consentement'), ('Obligation légale', 'obligation_legale'),
        ("Exécution d'un contrat", 'execution_contrat'), ('Intérêt légitime', 'interet_legitime'),
        ("Mission d'intérêt public", 'mission_interet_public'), ('Sauvegarde', 'sauvegarde_vie')])
    if c(130):
        registre['base_obligation_precision'] = c(130)
    registre['infos_communiquees'] = _multi(c(133), [
        ('Identité du responsable', 'identite_responsable'), ('Finalité', 'finalites_traitement'),
        ('Base légale', 'base_legale'), ('Caractère obligatoire', 'caractere_obligatoire'),
        ('Conséquences', 'consequences_defaut'), ('Destinataires', 'destinataires'),
        ('Droits', 'droits_personnes'), ('Durée de conservation', 'duree_conservation'),
        ('Coordonnées du DPO', 'coordonnees_dpo'), ('DPO', 'coordonnees_dpo'),
        ('Transferts', 'transferts_internationaux'), ('Mesures de sécurité', 'mesures_securite')])
    comment = _multi(c(134), [
        ('formulaire papier', 'mentions_formulaire_papier'), ('Politique de confidentialité', 'politique_confidentialite_site'),
        ('Affichage', 'affichage_locaux'), ('Courrier', 'courrier_email_personnalise'),
        ('Mentions légales', 'mentions_legales')])
    reste_c = _reste(c(134), ['Mentions sur formulaire papier',
                              "Politique de confidentialité/Notice d'information sur site web",
                              'Affichage dans les locaux', 'Courrier/Email personnalisé', 'Mentions légales'])
    if reste_c and len(reste_c) > 2:
        comment.append('autre')
        registre['comment_informer_autre'] = c(134)
    registre['comment_informer'] = comment

    # ----- Partie 4 : sous-traitance et transferts -----
    st: Dict[str, Any] = {'recours_sous_traitants': _oui_non(c(136))}
    if st['recours_sous_traitants'] == 'oui':
        contrats = _pick(c(137), [('certains', 'oui_certains'), ('tous', 'oui_tous'), ('non', 'non')])
        if contrats:
            st['contrats_sous_traitance'] = contrats
            st['contrats_sous_traitance_existence'] = 'non' if contrats == 'non' else 'oui'
        m = re.search(r'\d+', c(138) or '')
        if m:
            st['nombre_sous_traitants'] = m.group()
        if 'toutes' in _norm(c(139)):
            st['clauses_obligatoires'] = ['toutes_clauses']
        else:
            st['clauses_obligatoires'] = _multi(c(139), [
                ('instruction du responsable', 'instruction_responsable'), ('confidentialité', 'confidentialite'),
                ('Mesures de sécurité', 'mesures_securite'), ('audit', 'possibilite_audit'),
                ('Sort des données', 'sort_donnees_fin'), ('Interdiction de sous-traiter', 'interdiction_sous_traiter')])
    st['transfert_hors_cedeao'] = _oui_non(c(140))
    if st['transfert_hors_cedeao'] == 'oui':
        if c(141):
            st['pays_transferts'] = [p.strip() for p in re.split(r'[,;/]', c(141)) if p.strip()]
        concerne = _pick(c(142), [('tout le fichier', 'tout_fichier'), ('partie', 'partie_fichier')])
        if concerne:
            st['transfert_concerne'] = concerne
        if c(143):
            st['objet_transfert'] = c(143)
        st['autorisation_artci_transfert'] = _pick(c(144), [('en cours', 'demande_en_cours'), ('oui', 'oui'), ('non', 'non')])
        st['bases_juridiques_transfert'] = _multi(c(145), [
            ('Consentement', 'consentement'), ("Exécution d'un contrat", 'execution_contrat'),
            ("intérêt public", 'mission_interet_public'), ('Sauvegarde', 'sauvegarde_vie')])
        if c(146):
            st['garanties_appropriees_precision'] = c(146)
        st['garanties_transfert'] = _multi(c(147), [
            ('Clauses contractuelles types', 'clauses_contractuelles_types'), ('BCR', 'bcr'),
            ('Certification', 'certification_destinataire'), ('réciprocité', 'accord_reciprocite'),
            ('Évaluation du niveau', 'evaluation_protection'), ('Chiffrement', 'chiffrement'), ('Aucune', 'aucune')])
    st['suppression_anonymisation'] = _pick(c(148), [
        ('suppression', 'oui_suppression'), ('anonymisation', 'oui_anonymisation'),
        ('archivage', 'oui_archivage_securise'), ('indefiniment', 'non_indefiniment'), ('variable', 'variable')])
    st['protection_supports'] = _pick(c(149), [('non applicable', 'non_applicable'), ('oui', 'oui_documentee'), ('non', 'non')])

    # ----- Partie 5 : securite et formation -----
    sec: Dict[str, Any] = {
        # Le formulaire n'a que 2 options : seule « Oui, formalisee » vaut oui_formalisee.
        'politique_securite': ('oui_formalisee' if ('formalisee' in _norm(c(150)) and 'non formalisee' not in _norm(c(150)))
                               else ('non' if c(150) else None)),
        'mesures_techniques': _oui_non(c(151)),
        'mesures_organisationnelles': _oui_non(c(152)),
        'violation_12mois': _pick(c(153), [('ne sais pas', 'ne_sais_pas'), ('oui', 'oui'), ('non', 'non')]),
        'personnel_sensibilise': _pick(c(159), [
            ('periodique', 'oui_sensibilisation_periodique'), ('initiale', 'oui_formation_initiale'),
            ('ponctuelle', 'formation_ponctuelle'), ('non', 'non')]),
        'frequence_formations': _pick(c(160), [('reguliere', 'reguliere'), ('ponctuelle', 'ponctuelle')]),
    }
    if sec['violation_12mois'] == 'oui':
        m = re.search(r'\d+', c(154) or '')
        if m:
            sec['nombre_violations'] = m.group()
        sec['notification_artci'] = _pick(c(155), [('72', 'oui_72h'), ('tardivement', 'oui_tardivement'), ('non', 'non')])
        sec['info_personnes_violation'] = _pick(c(156), [('certains cas', 'certains_cas'), ('oui', 'oui'), ('non', 'non')])
        sec['registre_violations'] = _oui_non(c(157))
        sec['procedures_violation'] = _pick(c(158), [
            ('non testee', 'oui_documentee_non_testee'), ('testee', 'oui_documentee_testee'),
            ('informelle', 'informelle'), ('non', 'non')])

    def _clean(d: Dict[str, Any]) -> Dict[str, Any]:
        return {k: v for k, v in d.items() if v not in (None, '', [], {})}

    return {
        'identification': _clean(ident),
        'cadre_juridique': _clean(cadre),
        'registre': _clean(registre),
        'sous_traitance_transferts': _clean(st),
        'securite': _clean(sec),
    }
