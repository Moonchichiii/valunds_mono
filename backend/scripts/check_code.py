import subprocess
import sys

checks = [
    ('ruff check backend/', 'Ruff Lint'),
    ('ruff format --check backend/', 'Ruff Format'),
    ('python manage.py check', 'Django Check'),
]

results = []
for cmd, name in checks:
    print(f'\n Running {name}...')
    result = subprocess.run(cmd, shell=True)
    results.append(result.returncode == 0)

sys.exit(0 if all(results) else 1)
