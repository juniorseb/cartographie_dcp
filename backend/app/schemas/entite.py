"""
Schemas Marshmallow pour les entités et toutes les tables enfants.
Le fichier le plus volumineux : couvre les 17 tables liées à EntiteBase.
"""
from marshmallow import Schema, fields, validate
from app.schemas.common import EnumField


# ============================================================
# SCHEMAS ENFANTS ONE-TO-ONE
# ============================================================

class EntiteContactSchema(Schema):
    """EntiteContact - input & output."""
    responsable_legal_nom = fields.String(validate=validate.Length(max=200))
    responsable_legal_fonction = fields.String(validate=validate.Length(max=200))
    responsable_legal_email = fields.Email(load_default=None)
    responsable_legal_telephone = fields.String(validate=validate.Length(max=20))
    site_web = fields.String(validate=validate.Length(max=500))


class EntiteWorkflowOutputSchema(Schema):
    """EntiteWorkflow - output seulement."""
    entite_id = fields.String()
    statut = EnumField()
    numero_autorisation_artci = fields.String()
    date_soumission = fields.DateTime()
    date_validation = fields.DateTime()
    date_publication = fields.DateTime()
    date_rejet = fields.DateTime()
    motif_rejet = fields.String()
    createdBy = fields.String()
    assignedTo = fields.String()
    created_by_user = fields.Nested('UserSummarySchema', dump_default=None)
    assigned_to_user = fields.Nested('UserSummarySchema', dump_default=None)
    createdAt = fields.DateTime()
    updatedAt = fields.DateTime()


class EntiteLocalisationSchema(Schema):
    """EntiteLocalisation - input & output."""
    latitude = fields.Float()
    longitude = fields.Float()
    precision_gps = fields.String(validate=validate.Length(max=50))
    methode_geolocalisation = fields.String(validate=validate.Length(max=100))
    adresse_complete = fields.String(validate=validate.Length(max=500))
    code_postal = fields.String(validate=validate.Length(max=20))


class EntiteConformiteOutputSchema(Schema):
    """EntiteConformite - output seulement."""
    score_conformite = fields.Integer()
    statut_conformite = EnumField()
    a_dpo = fields.Boolean()
    type_dpo = EnumField()
    effectif_entreprise = fields.String()
    volume_donnees_traitees = fields.String()
    delai_mise_en_conformite = fields.Date()


class SecuriteConformiteSchema(Schema):
    """SecuriteConformite - input & output."""
    politique_securite = fields.Boolean()
    responsable_securite = fields.Boolean()
    analyse_risques = fields.Boolean()
    plan_continuite = fields.Boolean()
    notification_violations = fields.Boolean()
    nombre_violations_12mois = fields.Integer()
    formation_personnel = fields.Boolean()
    frequence_formation = fields.String(validate=validate.Length(max=100))
    dernier_audit = fields.Date()


# ============================================================
# SCHEMAS ENFANTS ONE-TO-MANY
# ============================================================

class ResponsableLegalSchema(Schema):
    id = fields.String(dump_only=True)
    nom = fields.String(required=True, validate=validate.Length(min=1, max=200))
    prenom = fields.String(validate=validate.Length(max=200))
    fonction = fields.String(validate=validate.Length(max=200))
    email = fields.Email(load_default=None)
    telephone = fields.String(validate=validate.Length(max=20))


class DPOSchema(Schema):
    id = fields.String(dump_only=True)
    nom = fields.String(required=True, validate=validate.Length(min=1, max=200))
    prenom = fields.String(validate=validate.Length(max=200))
    email = fields.Email(load_default=None)
    telephone = fields.String(validate=validate.Length(max=20))
    type = fields.String(required=True, validate=validate.OneOf(['interne', 'externe']))
    organisme = fields.String(validate=validate.Length(max=255))
    date_designation = fields.Date()


class ConformiteAdministrativeSchema(Schema):
    id = fields.String(dump_only=True)
    connaissance_loi_2013 = fields.Boolean()
    declaration_artci = fields.Boolean()
    numero_declaration = fields.String(validate=validate.Length(max=100))
    date_declaration = fields.Date()
    autorisation_artci = fields.Boolean()
    numero_autorisation = fields.String(validate=validate.Length(max=100))
    date_autorisation = fields.Date()


class DocumentJointOutputSchema(Schema):
    """Documents joints - output seulement (upload séparé)."""
    id = fields.String()
    type_document = EnumField()
    nom_fichier = fields.String()
    chemin_fichier = fields.String()
    taille = fields.Integer()
    mime_type = fields.String()
    uploadedAt = fields.DateTime()


class RegistreTraitementSchema(Schema):
    id = fields.String(dump_only=True)
    nom_traitement = fields.String(required=True, validate=validate.Length(min=1, max=255))
    description = fields.String()
    finalite = fields.String()
    base_legale = fields.String(validate=validate.Length(max=255))
    categories_personnes = fields.String()
    duree_conservation = fields.String(validate=validate.Length(max=100))
    destinataires = fields.String()
    transfert_hors_ci = fields.Boolean()


class CategorieDonneesSchema(Schema):
    id = fields.String(dump_only=True)
    registre_traitement_id = fields.String()
    categorie = fields.String(required=True, validate=validate.OneOf([
        'identite', 'contact', 'financieres', 'sante', 'biometriques',
        'localisation', 'professionnelles', 'sensibles', 'mineurs', 'autre'
    ]))
    description = fields.String()
    volume_estime = fields.String(validate=validate.Length(max=100))


class FinaliteBaseLegaleSchema(Schema):
    id = fields.String(dump_only=True)
    finalite = fields.String(required=True, validate=validate.Length(min=1, max=255))
    base_legale = fields.String(required=True, validate=validate.OneOf([
        'consentement', 'contrat', 'obligation_legale',
        'interet_vital', 'mission_publique', 'interet_legitime'
    ]))
    pourcentage = fields.Integer(validate=validate.Range(min=0, max=100))
    description = fields.String()


class SousTraitanceSchema(Schema):
    id = fields.String(dump_only=True)
    nom_sous_traitant = fields.String(required=True, validate=validate.Length(min=1, max=255))
    pays = fields.String(validate=validate.Length(max=100))
    type_donnees_partagees = fields.String()
    contrat_sous_traitance = fields.Boolean()
    clauses_protection = fields.Boolean()
    audit_sous_traitant = fields.Boolean()


class TransfertInternationalSchema(Schema):
    id = fields.String(dump_only=True)
    pays_destination = fields.String(required=True, validate=validate.Length(min=1, max=100))
    organisme_destinataire = fields.String(validate=validate.Length(max=255))
    base_juridique = fields.String(validate=validate.Length(max=255))
    garanties_appropriees = fields.String()
    autorisation_artci = fields.Boolean()


class MesureSecuriteSchema(Schema):
    id = fields.String(dump_only=True)
    type_mesure = fields.String(required=True, validate=validate.OneOf([
        'technique', 'organisationnelle', 'physique'
    ]))
    description = fields.String(required=True)
    mise_en_oeuvre = fields.Boolean()
    date_mise_en_oeuvre = fields.Date()


class CertificationSecuriteSchema(Schema):
    id = fields.String(dump_only=True)
    nom_certification = fields.String(required=True, validate=validate.Length(min=1, max=255))
    organisme_certificateur = fields.String(validate=validate.Length(max=255))
    date_obtention = fields.Date()
    date_expiration = fields.Date()
    numero_certificat = fields.String(validate=validate.Length(max=100))


class RenouvellementOutputSchema(Schema):
    id = fields.String()
    date_demande = fields.DateTime()
    date_expiration_agrement = fields.Date()
    motif = fields.String()
    statut = EnumField()
    traite_par = fields.String()
    date_traitement = fields.DateTime()
    commentaire = fields.String()
    createdAt = fields.DateTime()


class RenouvellementInputSchema(Schema):
    date_expiration_agrement = fields.Date()
    motif = fields.String()


# ============================================================
# SCHEMAS ENTITE BASE - TOP LEVEL
# ============================================================

class EntiteCreateInputSchema(Schema):
    """Formulaire complet de création (50 questions, 5 parties)."""
    # Partie 1 : Identification
    denomination = fields.String(required=True, validate=validate.Length(min=2, max=255))
    numero_cc = fields.String(required=True, validate=validate.Length(min=2, max=50))
    forme_juridique = fields.String(validate=validate.Length(max=100))
    secteur_activite = fields.String(validate=validate.Length(max=100))
    adresse = fields.String(validate=validate.Length(max=500))
    ville = fields.String(validate=validate.Length(max=100))
    region = fields.String(validate=validate.Length(max=100))
    telephone = fields.String(validate=validate.Length(max=20))
    email = fields.Email(load_default=None)
    # Objets enfants imbriqués
    contact = fields.Nested(EntiteContactSchema, load_default=None)
    localisation = fields.Nested(EntiteLocalisationSchema, load_default=None)
    securite = fields.Nested(SecuriteConformiteSchema, load_default=None)
    # Listes enfants
    responsables_legaux = fields.List(fields.Nested(ResponsableLegalSchema), load_default=[])
    dpos = fields.List(fields.Nested(DPOSchema), load_default=[])
    conformites_administratives = fields.List(
        fields.Nested(ConformiteAdministrativeSchema), load_default=[]
    )
    registre_traitements = fields.List(fields.Nested(RegistreTraitementSchema), load_default=[])
    categories_donnees = fields.List(fields.Nested(CategorieDonneesSchema), load_default=[])
    finalites = fields.List(fields.Nested(FinaliteBaseLegaleSchema), load_default=[])
    sous_traitants = fields.List(fields.Nested(SousTraitanceSchema), load_default=[])
    transferts = fields.List(fields.Nested(TransfertInternationalSchema), load_default=[])
    mesures_securite = fields.List(fields.Nested(MesureSecuriteSchema), load_default=[])
    certifications = fields.List(fields.Nested(CertificationSecuriteSchema), load_default=[])


class EntiteUpdateInputSchema(Schema):
    """Mise à jour partielle d'une entité (tous champs optionnels)."""
    denomination = fields.String(validate=validate.Length(min=2, max=255))
    forme_juridique = fields.String(validate=validate.Length(max=100))
    secteur_activite = fields.String(validate=validate.Length(max=100))
    adresse = fields.String(validate=validate.Length(max=500))
    ville = fields.String(validate=validate.Length(max=100))
    region = fields.String(validate=validate.Length(max=100))
    telephone = fields.String(validate=validate.Length(max=20))
    email = fields.Email()
    contact = fields.Nested(EntiteContactSchema)
    localisation = fields.Nested(EntiteLocalisationSchema)
    securite = fields.Nested(SecuriteConformiteSchema)
    responsables_legaux = fields.List(fields.Nested(ResponsableLegalSchema))
    dpos = fields.List(fields.Nested(DPOSchema))
    conformites_administratives = fields.List(fields.Nested(ConformiteAdministrativeSchema))
    registre_traitements = fields.List(fields.Nested(RegistreTraitementSchema))
    categories_donnees = fields.List(fields.Nested(CategorieDonneesSchema))
    finalites = fields.List(fields.Nested(FinaliteBaseLegaleSchema))
    sous_traitants = fields.List(fields.Nested(SousTraitanceSchema))
    transferts = fields.List(fields.Nested(TransfertInternationalSchema))
    mesures_securite = fields.List(fields.Nested(MesureSecuriteSchema))
    certifications = fields.List(fields.Nested(CertificationSecuriteSchema))


class EntiteListOutputSchema(Schema):
    """Entité compacte pour les vues liste (public + admin)."""
    id = fields.String()
    denomination = fields.String()
    numero_cc = fields.String()
    forme_juridique = fields.String()
    secteur_activite = fields.String()
    ville = fields.String()
    region = fields.String()
    origine_saisie = EnumField()
    publie_sur_carte = fields.Boolean()
    statut_conformite = fields.Method('get_statut_conformite')
    statut_workflow = fields.Method('get_statut_workflow')
    score_conformite = fields.Method('get_score_conformite')
    latitude = fields.Method('get_latitude')
    longitude = fields.Method('get_longitude')
    a_dpo = fields.Method('get_a_dpo')
    finalite_principale = fields.Method('get_finalite_principale')
    finalites_top = fields.Method('get_finalites_top')
    numero_autorisation = fields.Method('get_numero_autorisation')
    createdAt = fields.DateTime()

    def get_statut_conformite(self, obj):
        if obj.conformite and obj.conformite.statut_conformite:
            return obj.conformite.statut_conformite.value
        return None

    def get_statut_workflow(self, obj):
        return obj.workflow.statut.value if obj.workflow else None

    def get_score_conformite(self, obj):
        return obj.conformite.score_conformite if obj.conformite else None

    def get_latitude(self, obj):
        return obj.localisation.latitude if obj.localisation else None

    def get_longitude(self, obj):
        return obj.localisation.longitude if obj.localisation else None

    def get_a_dpo(self, obj):
        return obj.conformite.a_dpo if obj.conformite else None

    def get_finalite_principale(self, obj):
        finalites = list(obj.finalites) if obj.finalites else []
        if finalites:
            top = max(finalites, key=lambda f: f.pourcentage or 0)
            return top.finalite
        return None

    def get_finalites_top(self, obj):
        """Top 3 finalités avec pourcentages pour les popups carte."""
        finalites = list(obj.finalites) if obj.finalites else []
        if not finalites:
            return []
        sorted_f = sorted(finalites, key=lambda f: f.pourcentage or 0, reverse=True)[:3]
        return [
            {'nom': f.finalite, 'pourcentage': f.pourcentage or 0}
            for f in sorted_f
        ]

    def get_numero_autorisation(self, obj):
        return obj.workflow.numero_autorisation_artci if obj.workflow else None


class EntiteDetailOutputSchema(Schema):
    """Détail complet d'une entité avec toutes les relations."""
    id = fields.String()
    compte_entreprise_id = fields.String()
    denomination = fields.String()
    numero_cc = fields.String()
    forme_juridique = fields.String()
    secteur_activite = fields.String()
    adresse = fields.String()
    ville = fields.String()
    region = fields.String()
    telephone = fields.String()
    email = fields.String()
    origine_saisie = EnumField()
    publie_sur_carte = fields.Boolean()
    createdAt = fields.DateTime()
    updatedAt = fields.DateTime()
    # ONE-TO-ONE
    contact = fields.Nested(EntiteContactSchema, dump_default=None)
    workflow = fields.Nested(EntiteWorkflowOutputSchema, dump_default=None)
    localisation = fields.Nested(EntiteLocalisationSchema, dump_default=None)
    conformite = fields.Nested(EntiteConformiteOutputSchema, dump_default=None)
    securite = fields.Nested(SecuriteConformiteSchema, dump_default=None)
    # ONE-TO-MANY
    responsables_legaux = fields.List(fields.Nested(ResponsableLegalSchema))
    dpos = fields.List(fields.Nested(DPOSchema))
    conformites_administratives = fields.List(fields.Nested(ConformiteAdministrativeSchema))
    documents = fields.List(fields.Nested(DocumentJointOutputSchema))
    registre_traitements = fields.List(fields.Nested(RegistreTraitementSchema))
    categories_donnees = fields.List(fields.Nested(CategorieDonneesSchema))
    finalites = fields.List(fields.Nested(FinaliteBaseLegaleSchema))
    sous_traitants = fields.List(fields.Nested(SousTraitanceSchema))
    transferts = fields.List(fields.Nested(TransfertInternationalSchema))
    mesures_securite = fields.List(fields.Nested(MesureSecuriteSchema))
    certifications = fields.List(fields.Nested(CertificationSecuriteSchema))
    renouvellements = fields.List(fields.Nested(RenouvellementOutputSchema))


class EntitePublicDetailSchema(Schema):
    """Détail public d'une entité (sans données admin/workflow internes)."""
    id = fields.String()
    denomination = fields.String()
    numero_cc = fields.String()
    forme_juridique = fields.String()
    secteur_activite = fields.String()
    adresse = fields.String()
    ville = fields.String()
    region = fields.String()
    telephone = fields.String()
    email = fields.String()
    statut_conformite = fields.Method('get_statut_conformite')
    score_conformite = fields.Method('get_score_conformite')
    a_dpo = fields.Method('get_a_dpo')
    latitude = fields.Method('get_latitude')
    longitude = fields.Method('get_longitude')
    contact = fields.Nested(EntiteContactSchema, dump_default=None)
    finalites = fields.List(fields.Nested(FinaliteBaseLegaleSchema))

    def get_statut_conformite(self, obj):
        if obj.conformite and obj.conformite.statut_conformite:
            return obj.conformite.statut_conformite.value
        return None

    def get_score_conformite(self, obj):
        return obj.conformite.score_conformite if obj.conformite else None

    def get_a_dpo(self, obj):
        return obj.conformite.a_dpo if obj.conformite else None

    def get_latitude(self, obj):
        return obj.localisation.latitude if obj.localisation else None

    def get_longitude(self, obj):
        return obj.localisation.longitude if obj.localisation else None


class EntiteFilterSchema(Schema):
    """Paramètres de filtrage pour les listes d'entités."""
    search = fields.String()
    secteur_activite = fields.String()
    ville = fields.String()
    region = fields.String()
    forme_juridique = fields.String()
    statut_conformite = fields.String(validate=validate.OneOf([
        'Conforme', 'Démarche achevée', 'Démarche en cours'
    ]))
    statut_workflow = fields.String(validate=validate.OneOf([
        'brouillon', 'brouillon_artci', 'soumis', 'en_verification',
        'en_attente_complements', 'conforme', 'conforme_sous_reserve',
        'valide', 'rejete', 'publie'
    ]))
    origine_saisie = fields.String(validate=validate.OneOf([
        'auto_recensement', 'saisie_artci', 'rapprochement'
    ]))
    publie_sur_carte = fields.Boolean()
