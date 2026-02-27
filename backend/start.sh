#!/usr/bin/env bash
set -e

echo "=== Running database migrations ==="
flask db upgrade

echo "=== Seeding data (if tables are empty) ==="
python seed.py || true

echo "=== Starting Gunicorn ==="
exec gunicorn run:app -c gunicorn.conf.py
