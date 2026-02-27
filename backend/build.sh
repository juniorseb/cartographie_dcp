#!/usr/bin/env bash
set -e

pip install -r requirements.txt

# Run migrations
flask db upgrade

# Seed data (only if tables are empty)
python seed.py
