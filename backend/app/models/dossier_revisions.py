"""
Modele DossierRevision : versionning des soumissions d'un dossier.

Modele metier PR : chaque soumission entreprise produit une revision figee
du formulaire. On peut consulter "que disait le dossier au cycle N ?" et
afficher un diff entre revisions cote agent.
"""
from app.extensions import db
from app.models.base import UUIDMixin
from sqlalchemy.dialects.postgresql import JSONB


class DossierRevision(UUIDMixin, db.Model):
    __tablename__ = 'dossier_revisions'
    __table_args__ = (
        db.UniqueConstraint('entite_id', 'numero_revision', name='uq_revision_entite_numero'),
        db.Index('ix_dossier_revisions_entite_numero', 'entite_id', 'numero_revision'),
    )

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'),
        nullable=False, index=True,
    )
    # Numero de revision (1 = premiere soumission, 2 = re-soumission apres retour, ...)
    numero_revision = db.Column(db.Integer, nullable=False)
    # Snapshot fige des reponses du formulaire au moment de la soumission
    reponses_snapshot = db.Column(JSONB, nullable=False)
    # Statut workflow au moment du snapshot (soumis / re_soumis / ...)
    statut_au_moment = db.Column(db.String(50))
    # Score automatique calcule au moment du snapshot (info indicative)
    score_automatique_snapshot = db.Column(db.Integer)

    # Qui a soumis (compte entreprise)
    soumis_par_compte_id = db.Column(
        db.String(36), db.ForeignKey('comptes_entreprises.id'), index=True,
    )
    soumis_le = db.Column(
        db.DateTime(timezone=True), nullable=False, server_default=db.func.now()
    )

    entite = db.relationship('EntiteBase')

    def __repr__(self):
        return f'<DossierRevision {self.entite_id} #{self.numero_revision}>'
