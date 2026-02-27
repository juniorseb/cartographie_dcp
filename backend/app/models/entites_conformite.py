"""
Modèle EntiteConformite - Score et statut de conformité d'une entité.
Relation ONE-TO-ONE avec EntiteBase (PK = entite_id).
Utilise les 3 nouveaux statuts v2.2 : Conforme, Démarche achevée, Démarche en cours.
"""
from app.extensions import db
from app.models.enums import StatutConformiteEnum, TypeDPOEnum


class EntiteConformite(db.Model):
    __tablename__ = 'entites_conformite'
    __table_args__ = (
        db.CheckConstraint(
            'score_conformite >= 0 AND score_conformite <= 100',
            name='ck_score_conformite_range'
        ),
    )

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'), primary_key=True
    )
    score_conformite = db.Column(db.Integer)
    statut_conformite = db.Column(
        db.Enum(StatutConformiteEnum, name='statut_conformite_enum'), index=True
    )
    a_dpo = db.Column(db.Boolean)
    type_dpo = db.Column(db.Enum(TypeDPOEnum, name='type_dpo_enum'))
    effectif_entreprise = db.Column(db.String(50))
    volume_donnees_traitees = db.Column(db.String(100))
    delai_mise_en_conformite = db.Column(db.Date)

    # Relationship
    entite = db.relationship('EntiteBase', back_populates='conformite')

    def __repr__(self):
        return f'<EntiteConformite {self.entite_id} score={self.score_conformite}>'
