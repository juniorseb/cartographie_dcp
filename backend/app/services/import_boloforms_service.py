"""
Service d'import des reponses du formulaire Google Forms / BoloForms
(QUESTIONNAIRE DE RECENSEMENT ET D'EVALUATION DE LA CONFORMITE - 171 colonnes).

Ce service prend en entree le CSV exporte tel quel depuis BoloForms / Google Sheets
et cree une entite par ligne avec toutes les donnees rattachees (DPO, conformite,
registre traitements, finalites, sous-traitants, transferts, securite).
"""
import csv
import io
import re
from datetime import datetime
from app.extensions import db
from app.models import EntiteBase
from app.services.entite_service import EntiteService


# --- Indices des colonnes (1-based comme dans le CSV) ---
# Voir le fichier "QUESTIONNAIRE DE RECENSEMENT ET D'EVALUATION DE LA CONFORMITE"
COL = {
    'horodateur': 1,
    'soumis_par_nom': 2,
    'soumis_par_fonction': 3,
    'soumis_par_email': 4,
    'soumis_par_tel': 5,
    'statut_juridique': 6,
    'secteur_activite': 7,
    'activite_principale': 8,
    'volume_donnees': 9,
    'resp_legal_nom': 10,
    'resp_legal_fonction': 11,
    'resp_legal_email': 12,
    'resp_legal_tel': 13,
    'precision_droit_prive': 14,
    'precision_droit_public': 15,
    'identification_entite': 16,  # Personne physique / Personne morale
    'denomination': 17,
    'raison_sociale': 18,
    'numero_cc': 19,
    'adresse_siege': 20,
    'ville': 21,
    'commune': 22,
    'region': 23,
    'longitude': 24,
    'latitude': 25,
    'fax': 26,
    'boite_postale': 27,
    'effectif': 28,
    # 29-40 : section personne physique (mirroir)
    'pp_nom': 29,
    'pp_fonction': 30,
    'pp_adresse': 31,
    'pp_ville': 32,
    'pp_commune': 33,
    'pp_region': 34,
    'pp_longitude': 35,
    'pp_latitude': 36,
    'pp_bp': 37,
    'pp_telephone': 38,
    'pp_email': 39,
    'pp_pays': 40,
    # Cadre juridique
    'connaissance_loi_2013': 41,
    'connaissance_obligations': 42,
    'connaissance_role_artci': 43,
    'a_dpo': 44,
    'dpo_nom': 45,
    'dpo_email': 46,
    'dpo_telephone': 47,
    'dpo_date_designation': 48,
    'dpo_type': 49,  # interne / externe
    'dpo_profil_requis': 50,
    'distinction_declaration_autorisation': 51,
    'formalites_effectuees': 52,  # Oui/Non/En cours
    'demarche_stade': 53,
    'accompagnement_externe': 54,
    'accompagnement_structure': 55,
    'raison_pas_formalites': 56,
    'raison_exemption': 57,
    'registre_traitements_tenu': 58,
    'registre_forme': 59,
    'categories_personnes': 60,
    'donnees_standards': 61,
    'donnees_sensibles': 62,
    # Cols 63-126 : 12 traitements x 4-5 champs (Detail / Origine / [Si indirect] / Duree / Destinataires)
    # On va les parser dynamiquement.
    'finalite': 127,
    'finalite_explicite': 128,
    'base_legale': 129,
    'precision_obligation_interet': 130,
    'mode_traitement': 131,
    'informer_personnes': 132,
    'infos_communiquees': 133,
    'comment_informer': 134,
    'reutilisation_donnees': 135,
    'sous_traitants_recours': 136,
    'sous_traitants_contrats': 137,
    'sous_traitants_nombre': 138,
    'sous_traitants_clauses': 139,
    'transfert_hors_cedeao': 140,
    'transfert_pays': 141,
    'transfert_concerne': 142,
    'transfert_finalite': 143,
    'transfert_autorisation_artci': 144,
    'transfert_base_juridique': 145,
    'transfert_precision_garanties': 146,
    'transfert_garanties': 147,
    'suppression_anonymisation': 148,
    'protection_supports': 149,
    'politique_securite': 150,
    'mesures_techniques': 151,
    'mesures_organisationnelles': 152,
    'violations_12mois': 153,
    'violations_nombre': 154,
    'violations_notif_artci': 155,
    'violations_info_personnes': 156,
    'violations_registre': 157,
    'violations_procedures': 158,
    'formation_personnel': 159,
    'frequence_formations': 160,
    'certification': 161,
    'nom_complet_structure': 162,
    'region_district2': 163,
    'demarche_audit': 164,
    'demarche_registre': 165,
    'demarche_mesures': 166,
    'demarche_depot': 167,
    'demarche_formation': 168,
    'demarche_finalisation': 169,
    'numero_declaration_autorisation': 170,
    'donnees_sensibles_2': 171,
}


# --- Helpers ---

def _s(row, idx):
    """Recupere la valeur cellule par index (1-based), trim, None si vide ou '-'."""
    if idx > len(row):
        return None
    v = row[idx - 1]
    if v is None:
        return None
    s = str(v).strip()
    if not s or s == '-':
        return None
    return s


def _b(row, idx):
    """Convertit une cellule en booleen (Oui/Non, True/False)."""
    s = _s(row, idx)
    if s is None:
        return None
    s = s.lower()
    if s in ('oui', 'yes', 'true', 'vrai', '1', 'o'):
        return True
    if s in ('non', 'no', 'false', 'faux', '0', 'n'):
        return False
    # Reponses du type "Non, pas encore designe", "Oui, en partie"...
    if s.startswith('oui'):
        return True
    if s.startswith('non'):
        return False
    return None


def _f(row, idx):
    """Convertit une cellule en float (longitude / latitude)."""
    s = _s(row, idx)
    if s is None:
        return None
    # Supporter les virgules decimales
    s = s.replace(',', '.')
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _date(row, idx):
    """Convertit une cellule en date ISO (YYYY-MM-DD)."""
    s = _s(row, idx)
    if s is None:
        return None
    # Format jj/mm/aaaa courant des Google Forms
    for fmt in ('%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y %H:%M:%S'):
        try:
            return datetime.strptime(s[:19], fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


# --- Mapping des secteurs : aligner avec nos enums ---

SECTEUR_MAP = {
    'banque': 'Banque & Finance',
    'bancaire': 'Banque & Finance',
    'finance': 'Banque & Finance',
    'sante': 'Santé',
    'santé': 'Santé',
    'medical': 'Santé',
    'tic': 'Telecommunications/TIC',
    'telecom': 'Telecommunications/TIC',
    'télécom': 'Telecommunications/TIC',
    'education': 'Education',
    'éducation': 'Education',
    'commerce': 'Commerce',
    'industrie': 'Industrie',
    'transport': 'Transport',
    'energie': 'Energie',
    'énergie': 'Energie',
    'agriculture': 'Agriculture',
    'public': 'Administration publique',
    'administration': 'Administration publique',
    'assurance': 'Assurance',
}


def _normalize_secteur(val):
    """Normalise le secteur d'activite vers nos labels existants."""
    if not val:
        return None
    low = val.lower()
    for key, normalized in SECTEUR_MAP.items():
        if key in low:
            return normalized
    return val[:100]


def _normalize_dpo_type(val):
    """interne / externe."""
    if not val:
        return None
    low = val.lower()
    if 'externe' in low:
        return 'externe'
    if 'interne' in low or 'salarie' in low or 'salarié' in low:
        return 'interne'
    return None


def _generate_cc_placeholder(row, idx):
    """Genere un identifiant unique pour les personnes physiques sans CC."""
    horodateur = _s(row, COL['horodateur']) or ''
    nom = _s(row, COL['soumis_par_nom']) or _s(row, COL['pp_nom']) or 'inconnu'
    digest = re.sub(r'[^A-Za-z0-9]', '', f'{horodateur}{nom}')[:20]
    return f'PHYS-{digest or "X"}'


def _parse_traitements(row):
    """Cols 63-126 : 12 blocs de 4-5 colonnes (Detail / Origine / [Si indirect] / Duree / Destinataires).
    On extrait les blocs non vides."""
    traitements = []
    # Premier bloc commence a 63 (5 colonnes : detail, origine, si indirect, duree, destinataires)
    # Les blocs suivants suivent le meme pattern
    # Pour simplifier, on parcourt par groupes de 5
    start = 63
    end = 126
    block_size = 5
    i = start
    while i + block_size - 1 <= end:
        detail = _s(row, i)
        origine = _s(row, i + 1)
        si_indirect = _s(row, i + 2)
        duree = _s(row, i + 3)
        destinataires = _s(row, i + 4)
        if any([detail, origine, duree, destinataires]):
            traitements.append({
                'nom_traitement': (detail or 'Traitement')[:255],
                'description': detail,
                'duree_conservation': (duree or '')[:100],
                'destinataires': destinataires,
                'categories_personnes': si_indirect,
            })
        i += block_size
    return traitements


# --- Fonction principale ---

def import_boloforms_csv(file, user_id):
    """
    Importer les reponses du formulaire BoloForms (CSV 171 colonnes).
    Retourne {imported: N, skipped: M, errors: [{row, message}]}.
    """
    # Lire le fichier en supportant plusieurs encodages
    raw = file.read()
    if isinstance(raw, bytes):
        for encoding in ('utf-8', 'utf-8-sig', 'cp1252', 'latin-1'):
            try:
                content = raw.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError('Impossible de decoder le fichier (encodage inconnu).')
    else:
        content = raw

    # Detecter le delimiter (, ou ;)
    sample = content[:4000]
    delimiter = ',' if sample.count(',') >= sample.count(';') else ';'

    reader = csv.reader(io.StringIO(content), delimiter=delimiter)
    headers = next(reader, None)
    if not headers:
        raise ValueError('Fichier CSV vide.')

    if len(headers) < 50:
        raise ValueError(
            f'Le fichier semble invalide : {len(headers)} colonnes detectees, '
            f'au moins 50 attendues pour ce format.'
        )

    imported = 0
    skipped = 0
    errors = []

    for line_num, row in enumerate(reader, start=2):  # start=2 car ligne 1 = headers
        try:
            # --- Identification ---
            denomination = (
                _s(row, COL['denomination'])
                or _s(row, COL['raison_sociale'])
                or _s(row, COL['nom_complet_structure'])
                or _s(row, COL['soumis_par_nom'])
                or _s(row, COL['pp_nom'])
            )
            if not denomination:
                skipped += 1
                errors.append({'row': line_num, 'message': 'Aucune denomination trouvee.'})
                continue

            numero_cc = _s(row, COL['numero_cc']) or _generate_cc_placeholder(row, line_num)

            # Eviter les doublons (sur numero_cc)
            existing = EntiteBase.query.filter_by(numero_cc=numero_cc).first()
            if existing:
                skipped += 1
                errors.append({
                    'row': line_num,
                    'message': f'N° CC "{numero_cc}" existe deja (entite "{existing.denomination}").',
                })
                continue

            # Concatener ville et commune si commune presente
            ville = _s(row, COL['ville']) or _s(row, COL['pp_ville'])
            commune = _s(row, COL['commune']) or _s(row, COL['pp_commune'])
            if ville and commune and commune.lower() not in ville.lower():
                ville = f'{ville} ({commune})'
            elif commune and not ville:
                ville = commune

            data = {
                'denomination': denomination[:255],
                'numero_cc': numero_cc[:50],
                'forme_juridique': (
                    _s(row, COL['statut_juridique'])
                    or _s(row, COL['precision_droit_prive'])
                    or _s(row, COL['precision_droit_public'])
                ),
                'secteur_activite': _normalize_secteur(_s(row, COL['secteur_activite'])),
                'adresse': (
                    _s(row, COL['adresse_siege']) or _s(row, COL['pp_adresse'])
                ),
                'ville': _truncate(ville, 100),
                'region': _truncate(
                    _s(row, COL['region'])
                    or _s(row, COL['pp_region'])
                    or _s(row, COL['region_district2']),
                    100,
                ),
                'telephone': _truncate(
                    _s(row, COL['pp_telephone']) or _s(row, COL['soumis_par_tel']),
                    20,
                ),
                'email': _truncate(
                    _s(row, COL['pp_email']) or _s(row, COL['soumis_par_email']),
                    255,
                ),
            }

            # --- Contact / Responsable legal ---
            resp_nom = _s(row, COL['resp_legal_nom'])
            if resp_nom:
                data['contact'] = {
                    'responsable_legal_nom': resp_nom[:200],
                    'responsable_legal_fonction': (_s(row, COL['resp_legal_fonction']) or '')[:200],
                    'responsable_legal_email': _truncate(_s(row, COL['resp_legal_email']), 255),
                    'responsable_legal_telephone': _truncate(_s(row, COL['resp_legal_tel']), 20),
                }

            # --- Localisation GPS ---
            lat = _f(row, COL['latitude']) or _f(row, COL['pp_latitude'])
            lon = _f(row, COL['longitude']) or _f(row, COL['pp_longitude'])
            if lat is not None and lon is not None:
                data['localisation'] = {
                    'latitude': lat,
                    'longitude': lon,
                    'adresse_complete': data.get('adresse'),
                }

            # --- Cadre juridique : conformite administrative ---
            connaissance_loi = _b(row, COL['connaissance_loi_2013'])
            formalites = _s(row, COL['formalites_effectuees'])
            num_decl_aut = _s(row, COL['numero_declaration_autorisation'])
            if connaissance_loi is not None or formalites or num_decl_aut:
                data['conformites_administratives'] = [{
                    'connaissance_loi_2013': connaissance_loi,
                    'declaration_artci': bool(formalites) and (
                        'declaration' in formalites.lower() or 'oui' in formalites.lower()
                    ),
                    'autorisation_artci': bool(formalites) and 'autorisation' in formalites.lower(),
                    'numero_declaration': _truncate(num_decl_aut, 100),
                    'numero_autorisation': _truncate(num_decl_aut, 100),
                }]

            # --- DPO ---
            a_dpo = _b(row, COL['a_dpo'])
            dpo_nom = _s(row, COL['dpo_nom'])
            if dpo_nom:
                # Fractionner nom/prenom (heuristique : 1er token = nom, reste = prenom)
                parts = dpo_nom.split(maxsplit=1)
                nom_dpo = parts[0]
                prenom_dpo = parts[1] if len(parts) > 1 else ''
                data['dpos'] = [{
                    'nom': nom_dpo[:200],
                    'prenom': prenom_dpo[:200],
                    'email': _truncate(_s(row, COL['dpo_email']), 255),
                    'telephone': _truncate(_s(row, COL['dpo_telephone']), 20),
                    'type': _normalize_dpo_type(_s(row, COL['dpo_type'])) or 'interne',
                    'date_designation': _date(row, COL['dpo_date_designation']),
                }]

            # --- Registre des traitements ---
            traitements = _parse_traitements(row)
            if traitements:
                data['registre_traitements'] = traitements
            elif _b(row, COL['registre_traitements_tenu']):
                data['registre_traitements'] = [{
                    'nom_traitement': 'Registre tenu (forme : ' + (_s(row, COL['registre_forme']) or 'non specifie') + ')',
                    'description': 'Registre tenu, details non communiques dans le formulaire.',
                }]

            # --- Categories de donnees (standards / sensibles + categories de personnes) ---
            categories = []
            cats_str = _s(row, COL['categories_personnes'])
            if cats_str:
                categories.append({
                    'categorie': 'autre',
                    'description': _truncate(cats_str, 500),
                })
            standards = _s(row, COL['donnees_standards'])
            if standards:
                categories.append({
                    'categorie': 'identite',
                    'description': _truncate(f'Donnees standards : {standards}', 500),
                })
            sensibles = _s(row, COL['donnees_sensibles']) or _s(row, COL['donnees_sensibles_2'])
            if sensibles:
                categories.append({
                    'categorie': 'sensibles',
                    'description': _truncate(f'Donnees sensibles : {sensibles}', 500),
                })
            if categories:
                data['categories_donnees'] = categories

            # --- Finalites / Base legale ---
            finalite = _s(row, COL['finalite'])
            if finalite:
                base = _s(row, COL['base_legale']) or 'consentement'
                # Normaliser la base legale vers nos enums
                base_low = base.lower()
                if 'consent' in base_low:
                    base = 'consentement'
                elif 'contrat' in base_low:
                    base = 'contrat'
                elif 'oblig' in base_low or 'legale' in base_low:
                    base = 'obligation_legale'
                elif 'mission' in base_low or 'public' in base_low:
                    base = 'mission_publique'
                elif 'interet' in base_low and 'legitim' in base_low:
                    base = 'interet_legitime'
                elif 'vital' in base_low:
                    base = 'interet_vital'
                else:
                    base = 'consentement'
                data['finalites'] = [{
                    'finalite': finalite[:255],
                    'base_legale': base,
                }]

            # --- Sous-traitants ---
            if _b(row, COL['sous_traitants_recours']):
                nb_str = _s(row, COL['sous_traitants_nombre']) or ''
                m = re.search(r'\d+', nb_str)
                nb = int(m.group()) if m else 1
                clauses = _b(row, COL['sous_traitants_clauses'])
                contrats = _b(row, COL['sous_traitants_contrats'])
                data['sous_traitants'] = [{
                    'nom_sous_traitant': f'Sous-traitant {i + 1}',
                    'contrat_sous_traitance': contrats,
                    'clauses_protection': clauses,
                } for i in range(min(nb, 10))]

            # --- Transferts internationaux ---
            if _b(row, COL['transfert_hors_cedeao']):
                pays = _s(row, COL['transfert_pays']) or 'Non precise'
                data['transferts'] = [{
                    'pays_destination': pays[:100],
                    'organisme_destinataire': _s(row, COL['transfert_concerne']),
                    'base_juridique': _s(row, COL['transfert_base_juridique']),
                    'garanties_appropriees': _s(row, COL['transfert_garanties']),
                    'autorisation_artci': _b(row, COL['transfert_autorisation_artci']),
                }]

            # --- Securite globale ---
            politique = _b(row, COL['politique_securite'])
            if politique is not None:
                data['securite'] = {
                    'politique_securite': politique,
                    'analyse_risques': _b(row, COL['suppression_anonymisation']),
                    'plan_continuite': _b(row, COL['protection_supports']),
                    'notification_violations': _b(row, COL['violations_notif_artci']),
                    'nombre_violations_12mois': _safe_int(_s(row, COL['violations_nombre'])) or 0,
                    'formation_personnel': _b(row, COL['formation_personnel']),
                    'frequence_formation': _truncate(_s(row, COL['frequence_formations']), 100),
                }

            # --- Mesures de securite (techniques + organisationnelles) ---
            mesures = []
            mt = _s(row, COL['mesures_techniques'])
            if mt and mt.lower() not in ('non', 'aucune', '-'):
                mesures.append({
                    'type_mesure': 'technique',
                    'description': _truncate(mt, 500),
                    'mise_en_oeuvre': True,
                })
            mo = _s(row, COL['mesures_organisationnelles'])
            if mo and mo.lower() not in ('non', 'aucune', '-'):
                mesures.append({
                    'type_mesure': 'organisationnelle',
                    'description': _truncate(mo, 500),
                    'mise_en_oeuvre': True,
                })
            if mesures:
                data['mesures_securite'] = mesures

            # --- Certifications ---
            cert = _s(row, COL['certification'])
            if cert and cert.lower() not in ('non', 'aucune', '-', 'oui'):
                # 'cert' contient generalement le nom de la certification
                data['certifications'] = [{
                    'nom_certification': _truncate(cert, 255),
                }]

            # --- Creer l'entite ---
            entite = EntiteService.create_entite_with_children(
                data, user_id=user_id, origine='auto_recensement'
            )

            # --- Mettre a jour les champs conformite (effectif, volume, has_dpo) ---
            from app.models import EntiteConformite
            conf = EntiteConformite.query.get(entite.id)
            if conf:
                effectif = _s(row, COL['effectif'])
                if effectif:
                    conf.effectif_entreprise = _truncate(effectif, 50)
                volume = _s(row, COL['volume_donnees'])
                if volume:
                    conf.volume_donnees_traitees = _truncate(volume, 100)
                a_dpo_val = _b(row, COL['a_dpo'])
                if a_dpo_val is not None:
                    conf.a_dpo = a_dpo_val
                db.session.commit()

            imported += 1

        except Exception as e:  # noqa: BLE001
            db.session.rollback()
            errors.append({'row': line_num, 'message': str(e)[:200]})
            continue

    return {
        'imported': imported,
        'skipped': skipped,
        'errors': errors[:50],  # limiter le retour pour ne pas saturer
    }


def _safe_int(s):
    if not s:
        return None
    m = re.search(r'-?\d+', s)
    return int(m.group()) if m else None


def _truncate(s, max_len):
    """Tronque une string a max_len caracteres (None safe)."""
    if s is None:
        return None
    s = str(s)
    return s[:max_len] if len(s) > max_len else s
