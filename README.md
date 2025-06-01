# Finance Suite

This is a minimal full-stack example using **FastAPI**, **SQLModel**, **PostgreSQL**, **React** (with TypeScript, Vite and Chakra UI) and **Docker Compose**. It includes utilities to estimate German net salary and IG Metall tariff incomes.

## Development

Requirements: Docker and Docker Compose.

Start the stack for development:

```bash
docker compose up --build
```

Traefik will be available on `http://localhost:8877` and the backend runs on
port `8878`. The frontend is served through Traefik.

Run tests locally with:

```bash
pip install -r backend/requirements.txt
python -m pytest backend/tests -q
```
