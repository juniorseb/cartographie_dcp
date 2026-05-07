"""add contact_messages table

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2026-05-07 13:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'e5f6g7h8i9j0'
down_revision = 'd4e5f6g7h8i9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'contact_messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('nom', sa.String(200), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('telephone', sa.String(30), nullable=True),
        sa.Column('sujet', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('lu', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('traite_par', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index('ix_contact_messages_email', 'contact_messages', ['email'])
    op.create_index('ix_contact_messages_lu', 'contact_messages', ['lu'])


def downgrade():
    op.drop_index('ix_contact_messages_lu', 'contact_messages')
    op.drop_index('ix_contact_messages_email', 'contact_messages')
    op.drop_table('contact_messages')
