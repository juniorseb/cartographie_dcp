"""Envoi d'emails transactionnels via Flask-Mail."""
from flask import current_app


def _send(subject, recipients, body, html=None):
    """Envoi bas niveau via Flask-Mail (logs en DEV si pas de SMTP)."""
    try:
        from flask_mail import Message
        from app.extensions import mail
        msg = Message(subject=subject, recipients=recipients, body=body)
        if html:
            msg.html = html
        mail.send(msg)
        return True
    except Exception as e:
        # En dev sans SMTP : on log dans la console
        current_app.logger.info(f'[EMAIL] To={recipients} Subject={subject}\n{body}')
        current_app.logger.warning(f'Mail send failed: {e}')
        return False


def send_credentials_email(to, nom_complet, role, denomination, login_email, password):
    """Email contenant les acces de connexion (apres validation inscription)."""
    subject = "ARTCI DCP - Vos accès à la plateforme"
    body = (
        f"Bonjour {nom_complet},\n\n"
        f"Votre inscription en tant que {role} de l'entreprise « {denomination} » "
        f"sur la plateforme ARTCI DCP a été validée.\n\n"
        f"Vos accès à la plateforme :\n"
        f"   Email : {login_email}\n"
        f"   Mot de passe : {password}\n\n"
        f"Pour des raisons de sécurité, vous devrez changer ce mot de passe "
        f"lors de votre première connexion.\n\n"
        f"Connexion : https://dcp.artci.ci/connexion\n\n"
        f"Cordialement,\n"
        f"L'équipe ARTCI."
    )
    html = (
        f"<p>Bonjour <strong>{nom_complet}</strong>,</p>"
        f"<p>Votre inscription en tant que <strong>{role}</strong> de l'entreprise "
        f"<strong>{denomination}</strong> sur la plateforme ARTCI DCP a été validée.</p>"
        f"<p><strong>Vos accès à la plateforme :</strong></p>"
        f"<ul>"
        f"  <li>Email : <code>{login_email}</code></li>"
        f"  <li>Mot de passe : <code>{password}</code></li>"
        f"</ul>"
        f"<p>Pour des raisons de sécurité, vous devrez "
        f"<strong>changer ce mot de passe lors de votre première connexion</strong>.</p>"
        f"<p><a href='https://dcp.artci.ci/connexion'>Se connecter</a></p>"
        f"<p>Cordialement,<br>L'équipe ARTCI.</p>"
    )
    return _send(subject, [to], body, html)
