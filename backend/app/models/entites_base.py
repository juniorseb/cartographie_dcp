"""
Modèle EntiteBase - Table hub centrale pour toutes les entités déclarantes.
Reliée à 18+ tables via relationships ONE-TO-ONE et ONE-TO-MANY.
"""
from app.extensions import db
from app.models.base import UUIDMixin, TimestampMixin
from app.models.enums import OrigineSaisieEnum


class EntiteBase(UUIDMixin, TimestampMixin, db.Model):
    __tablename__ = 'entites_base'

    compte_entreprise_id = db.Column(
        db.String(36), db.ForeignKey('comptes_entreprises.id'), nullable=True, index=True
    )
    numero_cc = db.Column(db.String(50), unique=True, nullable=False)
    denomination = db.Column(db.String(255), nullable=False, index=True)
    forme_juridique = db.Column(db.String(100))
    secteur_activite = db.Column(db.String(100), index=True)
    adresse = db.Column(db.String(500))
    ville = db.Column(db.String(100), index=True)
    region = db.Column(db.String(100), index=True)
    telephone = db.Column(db.String(20))
    email = db.Column(db.String(255))
    origine_saisie = db.Column(
        db.Enum(OrigineSaisieEnum, name='origine_saisie_enum'), nullable=False
    )
    publie_sur_carte = db.Column(db.Boolean, default=False, nullable=False, index=True)

    # Relationship parent
    compte_entreprise = db.relationship('CompteEntreprise', back_populates='entites')

    # ONE-TO-ONE relationships
    contact = db.relationship(
        'EntiteContact', back_populates='entite', uselist=False, cascade='all, delete-orphan'
    )
    workflow = db.relationship(
        'EntiteWorkflow', back_populates='entite', uselist=False, cascade='all, delete-orphan'
    )
    localisation = db.relationship(
        'EntiteLocalisation', back_populates='entite', uselist=False, cascade='all, delete-orphan'
    )
    conformite = db.relationship(
        'EntiteConformite', back_populates='entite', uselist=False, cascade='all, delete-orphan'
    )
    securite = db.relationship(
        'SecuriteConformite', back_populates='entite', uselist=False, cascade='all, delete-orphan'
    )

    # ONE-TO-MANY relationships
    assignations = db.relationship(
        'AssignationDemande', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    feedbacks = db.relationship(
        'FeedbackVerification', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    demandes_rapprochement = db.relationship(
        'DemandeRapprochement', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    responsables_legaux = db.relationship(
        'ResponsableLegal', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    dpos = db.relationship(
        'DPO', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    conformites_administratives = db.relationship(
        'ConformiteAdministrative', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    documents = db.relationship(
        'DocumentJoint', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    registre_traitements = db.relationship(
        'RegistreTraitement', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    categories_donnees = db.relationship(
        'CategorieDonnees', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    finalites = db.relationship(
        'FinaliteBaseLegale', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    sous_traitants = db.relationship(
        'SousTraitance', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    transferts = db.relationship(
        'TransfertInternational', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    mesures_securite = db.relationship(
        'MesureSecurite', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    certifications = db.relationship(
        'CertificationSecurite', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    historique_statuts = db.relationship(
        'HistoriqueStatut', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )
    renouvellements = db.relationship(
        'Renouvellement', back_populates='entite', lazy='dynamic', cascade='all, delete-orphan'
    )

    def __repr__(self):
        return f'<EntiteBase {self.denomination} (CC: {self.numero_cc})>'
