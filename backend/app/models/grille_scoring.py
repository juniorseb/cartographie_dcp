"""
Modele GrilleScoring + GrilleCritere : grille de scoring officielle ARTCI
externalisee et versionnee.

Pourquoi versionner :
- la grille evolue dans le temps (revisions reglementaires)
- un score calcule en 2026 ne doit pas etre "recalculable" avec la grille 2027
- EntiteConformite.grille_version_id pointe sur la grille utilisee, pour
  que le ré-audit ulterieur retrouve le contexte exact.

Une seule grille active a la fois (flag actif=true). Les autres restent
consultables pour l'audit historique.
"""
from app.extensions import db
from app.models.base import UUIDMixin, TimestampMixin


class GrilleScoring(UUIDMixin, TimestampMixin, db.Model):
    __tablename__ = 'grille_scoring'

    version = db.Column(db.String(40), unique=True, nullable=False)  # ex: '2026.05.07'
    libelle = db.Column(db.String(200), nullable=False)
    actif = db.Column(db.Boolean, nullable=False, default=False)
    document_url = db.Column(db.String(500))  # lien vers la grille officielle PDF

    cree_par = db.Column(db.String(36), db.ForeignKey('users.id'))

    criteres = db.relationship(
        'GrilleCritere', back_populates='grille',
        cascade='all, delete-orphan', lazy='dynamic',
    )

    def __repr__(self):
        return f'<GrilleScoring {self.version} actif={self.actif}>'


class GrilleCritere(UUIDMixin, db.Model):
    __tablename__ = 'grille_critere'
    __table_args__ = (
        db.UniqueConstraint('grille_id', 'cle', name='uq_grille_critere_cle'),
    )

    grille_id = db.Column(
        db.String(36), db.ForeignKey('grille_scoring.id'),
        nullable=False, index=True,
    )
    # Cle stable a referencer dans le code de scoring : ex 'connaissance_loi'
    cle = db.Column(db.String(80), nullable=False)
    libelle = db.Column(db.String(200), nullable=False)
    poids_max = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text)
    ordre = db.Column(db.Integer, nullable=False, default=0)

    grille = db.relationship('GrilleScoring', back_populates='criteres')

    def __repr__(self):
        return f'<GrilleCritere {self.cle} {self.poids_max}pts>'
