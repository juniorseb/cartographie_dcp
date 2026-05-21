"""
Modele CommentaireDossier : commentaires ancres de l'agent sur les rubriques
du formulaire d'enregistrement.

Modele metier PR :
- chaque commentaire est ancre sur (rubrique + sous-question)
- chaque commentaire a un cycle de vie open -> resolved
- seul l'agent peut marquer un commentaire comme resolved
- la convergence d'un dossier exige que TOUS les commentaires open soient resolved
- les commentaires sont rattaches a une revision (le snapshot pour lequel
  ils ont ete formules) ; cela permet de voir l'historique au fil des cycles
"""
from app.extensions import db
from app.models.base import UUIDMixin


class CommentaireDossier(UUIDMixin, db.Model):
    __tablename__ = 'commentaires_dossier'
    __table_args__ = (
        db.Index('ix_commentaires_entite_etat', 'entite_id', 'etat'),
        db.Index('ix_commentaires_revision', 'revision_id'),
    )

    entite_id = db.Column(
        db.String(36), db.ForeignKey('entites_base.id'),
        nullable=False, index=True,
    )
    # Revision a laquelle le commentaire se rapporte (snapshot vu par l'agent)
    revision_id = db.Column(
        db.String(36), db.ForeignKey('dossier_revisions.id'),
        nullable=True,
    )
    # Agent qui a emis le commentaire
    agent_id = db.Column(
        db.String(36), db.ForeignKey('users.id'),
        nullable=False, index=True,
    )

    # Ancre : rubrique + sous-question (texte libre stable)
    # rubrique : 'identification' / 'cadre_juridique' / 'registre' /
    #            'sous_traitance_transferts' / 'securite'
    # sous_question : libelle court de la question/champ vise
    #                 (ex: 'volume_donnees', 'dpo.dpo_habilite', 'partie4.pays_transferts')
    rubrique = db.Column(db.String(64), nullable=False)
    sous_question = db.Column(db.String(200))

    contenu = db.Column(db.Text, nullable=False)

    # Cycle de vie : open -> resolved
    etat = db.Column(db.String(20), nullable=False, default='open', index=True)

    # Resolution (par l'agent uniquement)
    resolu_par = db.Column(db.String(36), db.ForeignKey('users.id'))
    resolu_le = db.Column(db.DateTime(timezone=True))
    # Si l'entreprise a repondu au commentaire (texte libre), on stocke la reponse
    reponse_entreprise = db.Column(db.Text)
    repondu_le = db.Column(db.DateTime(timezone=True))

    # --- L1 PR : threads + role + edition ---
    # Thread : un commentaire peut etre une reponse a un autre (cf. GitHub).
    # parent_id NULL = commentaire racine sur une rubrique.
    parent_id = db.Column(
        db.String(36), db.ForeignKey('commentaires_dossier.id'),
        nullable=True, index=True,
    )
    # Role de l'auteur a la creation : 'super_admin'|'admin'|'editor'|'entreprise'
    # (pour distinguer commentaire ARTCI vs reponse entreprise dans le thread)
    auteur_role = db.Column(db.String(20))
    # Edition par l'auteur avant resolution (rare, mais utile pour corriger
    # une faute de frappe). Apres resolution, plus modifiable.
    edited_at = db.Column(db.DateTime(timezone=True))

    cree_le = db.Column(
        db.DateTime(timezone=True), nullable=False, server_default=db.func.now()
    )
    maj_le = db.Column(
        db.DateTime(timezone=True), nullable=False,
        server_default=db.func.now(), onupdate=db.func.now()
    )

    entite = db.relationship('EntiteBase')
    revision = db.relationship('DossierRevision')
    agent = db.relationship('User', foreign_keys=[agent_id])

    def __repr__(self):
        return f'<CommentaireDossier {self.id} {self.rubrique}/{self.sous_question} {self.etat}>'
