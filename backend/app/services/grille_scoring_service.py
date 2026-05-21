"""
Service de gestion de la grille de scoring (manœuvre §4 + spec L1).

La grille est externalisee en BDD (table grille_scoring + grille_critere)
pour permettre a l'ARTCI d'ajuster les ponderations sans deploiement code.

Tant que la grille officielle n'est pas fournie, on utilise un PLACEHOLDER
qui reprend les ponderations actuelles du ScoringService legacy. Quand
l'ARTCI publiera sa grille definitive, on creera une nouvelle version dans
grille_scoring (actif=true) et le scoring basculera dessus.

Usage :
- creer_grille_placeholder() : seed la version 'placeholder-2026.05' avec
  les memes critères et poids que ScoringService.calculer_score (en dur)
- get_grille_active() : retourne la grille active (None si aucune)
- list_versions() : pour l'audit / interface admin de gestion des grilles
"""
from app.extensions import db
from app.models import GrilleScoring, GrilleCritere


# Critères placeholder (alignes sur ScoringService.calculer_score)
CRITERES_PLACEHOLDER = [
    {
        'cle': 'connaissance_loi',
        'libelle': 'Connaissance de la Loi 2013-450',
        'poids_max': 5,
        'description': "Le responsable a connaissance de la loi 2013-450 et de ses obligations.",
        'ordre': 10,
    },
    {
        'cle': 'designation_dpo',
        'libelle': "Désignation d'un DPO habilité ARTCI",
        'poids_max': 20,
        'description': "DPO designe et habilite par l'ARTCI (Arrete N°511).",
        'ordre': 20,
    },
    {
        'cle': 'formalites_artci',
        'libelle': 'Formalités ARTCI effectuées',
        'poids_max': 30,
        'description': "Declaration prealable ou autorisation prealable selon le regime applicable.",
        'ordre': 30,
    },
    {
        'cle': 'registre_traitements',
        'libelle': 'Registre de traitements à jour',
        'poids_max': 15,
        'description': "Registre des activites de traitement tenu et a jour.",
        'ordre': 40,
    },
    {
        'cle': 'information_personnes',
        'libelle': 'Information des personnes concernées',
        'poids_max': 10,
        'description': "Mention information + droits des personnes (acces, rectification, opposition).",
        'ordre': 50,
    },
    {
        'cle': 'contrats_sous_traitants',
        'libelle': 'Contrats sous-traitants conformes',
        'poids_max': 10,
        'description': "Contrats avec clauses obligatoires (instruction, confidentialite, securite, audit, sort des donnees).",
        'ordre': 60,
    },
    {
        'cle': 'charte_protection',
        'libelle': 'Charte de protection des données',
        'poids_max': 10,
        'description': "Charte formalisee et diffusee, avec mesures techniques + organisationnelles.",
        'ordre': 70,
    },
]


def creer_grille_placeholder(force=False):
    """Cree (idempotent) la grille placeholder. Appel idempotent : si la version
    existe deja, retourne celle-ci sauf si force=True (replace).
    """
    version = 'placeholder-2026.05'
    existing = GrilleScoring.query.filter_by(version=version).first()
    if existing and not force:
        return existing
    if existing and force:
        # On reset : supprime les criteres et recree
        for c in existing.criteres.all():
            db.session.delete(c)
        db.session.delete(existing)
        db.session.flush()

    grille = GrilleScoring(
        version=version,
        libelle='Grille placeholder (à remplacer par la grille officielle ARTCI)',
        actif=True,
        document_url=None,
    )
    db.session.add(grille)
    db.session.flush()

    for c in CRITERES_PLACEHOLDER:
        critere = GrilleCritere(grille_id=grille.id, **c)
        db.session.add(critere)
    db.session.flush()
    return grille


def get_grille_active():
    """Retourne la grille actuellement marquee active, ou None."""
    return GrilleScoring.query.filter_by(actif=True).first()


def list_versions():
    """Liste toutes les versions (pour interface admin de gestion)."""
    return GrilleScoring.query.order_by(GrilleScoring.createdAt.desc()).all()
