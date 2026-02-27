"""
Schemas Marshmallow pour le workflow, assignations, feedbacks, stats.
"""
from marshmallow import Schema, fields, validate
from app.schemas.common import EnumField


# --- ASSIGNATION ---

class AssignationCreateInputSchema(Schema):
    """POST /api/admin/assignation"""
    entite_id = fields.String(required=True)
    agent_id = fields.String(required=True)
    echeance = fields.Date(required=True)


class AssignationUpdateInputSchema(Schema):
    """PUT /api/admin/assignation/:id"""
    statut = fields.String(validate=validate.OneOf([
        'en_cours', 'traite_attente_validation', 'valide', 'en_retard'
    ]))
    commentaire = fields.String()


class AssignationOutputSchema(Schema):
    """Assignation sérialisée pour le panier."""
    id = fields.String()
    entite_id = fields.String()
    agent_id = fields.String()
    date_assignation = fields.DateTime()
    echeance = fields.Date()
    statut = EnumField()
    traite_le = fields.DateTime()
    valide_par = fields.String()
    valide_le = fields.DateTime()
    # Références imbriquées
    entite_denomination = fields.Method('get_entite_denomination')
    entite_numero_cc = fields.Method('get_entite_numero_cc')
    agent = fields.Nested('UserSummarySchema', dump_default=None)
    validateur = fields.Nested('UserSummarySchema', dump_default=None)

    def get_entite_denomination(self, obj):
        return obj.entite.denomination if obj.entite else None

    def get_entite_numero_cc(self, obj):
        return obj.entite.numero_cc if obj.entite else None


# --- FEEDBACK ---

class FeedbackCreateInputSchema(Schema):
    """POST /api/admin/feedbacks"""
    entite_id = fields.String(required=True)
    commentaires = fields.String()
    elements_manquants = fields.List(fields.String(), load_default=[])
    delai_fourniture = fields.Date()


class FeedbackOutputSchema(Schema):
    """Feedback sérialisé."""
    id = fields.String()
    entite_id = fields.String()
    agent_id = fields.String()
    date_feedback = fields.DateTime()
    commentaires = fields.String()
    elements_manquants = fields.Raw()
    delai_fourniture = fields.Date()
    agent = fields.Nested('UserSummarySchema', dump_default=None)
    createdAt = fields.DateTime()


# --- VALIDATION N+1 ---

class ValidationN1InputSchema(Schema):
    """PUT /api/admin/validation-n1/:id"""
    action = fields.String(required=True, validate=validate.OneOf(['valider', 'renvoyer']))
    commentaire = fields.String()


# --- HISTORIQUE ---

class HistoriqueStatutOutputSchema(Schema):
    """Historique des changements de statut."""
    id = fields.String()
    entite_id = fields.String()
    ancien_statut = fields.String()
    nouveau_statut = fields.String()
    date_changement = fields.DateTime()
    modifie_par = fields.String()
    commentaire = fields.String()
    modifie_par_user = fields.Nested('UserSummarySchema', dump_default=None)


# --- STATS ---

class PublicStatsOutputSchema(Schema):
    """GET /api/public/stats"""
    total_entites_conformes = fields.Integer()
    total_demarche_achevee = fields.Integer()
    total_demarche_en_cours = fields.Integer()
    par_secteur = fields.Dict(keys=fields.String(), values=fields.Integer())
    par_region = fields.Dict(keys=fields.String(), values=fields.Integer())
    par_ville = fields.Dict(keys=fields.String(), values=fields.Integer())


class AdminStatsFilterSchema(Schema):
    """Filtres de période pour stats admin."""
    date_debut = fields.Date()
    date_fin = fields.Date()
    region = fields.String()
    secteur = fields.String()


class AdminStatsOutputSchema(Schema):
    """GET /api/admin/stats"""
    total_entites = fields.Integer()
    par_statut_workflow = fields.Dict(keys=fields.String(), values=fields.Integer())
    par_statut_conformite = fields.Dict(keys=fields.String(), values=fields.Integer())
    par_secteur = fields.Dict(keys=fields.String(), values=fields.Integer())
    par_region = fields.Dict(keys=fields.String(), values=fields.Integer())
    par_origine = fields.Dict(keys=fields.String(), values=fields.Integer())
    demandes_en_cours = fields.Integer()
    demandes_en_retard = fields.Integer()
    agents_actifs = fields.Integer()


# --- DASHBOARD ENTREPRISE ---

class EntrepriseDashboardOutputSchema(Schema):
    """GET /api/entreprise/dashboard"""
    etape_courante = fields.Integer()
    statut_workflow = fields.String()
    statut_conformite = fields.String()
    peut_soumettre = fields.Boolean()
    peut_rapporter = fields.Boolean()
    feedbacks_non_lus = fields.Integer()


# --- EXPORT ---

class ExportFilterSchema(Schema):
    """Paramètres d'export."""
    format = fields.String(
        required=True,
        validate=validate.OneOf(['excel', 'csv', 'pdf'])
    )
    secteur_activite = fields.String()
    ville = fields.String()
    region = fields.String()


# --- IMPORT ---

class ImportResultSchema(Schema):
    """Résultat d'import Excel."""
    imported = fields.Integer()
    errors = fields.List(fields.Dict())
