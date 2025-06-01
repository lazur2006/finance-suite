# Finance Suite

This is a minimal full-stack example using **FastAPI**, **SQLModel**, **PostgreSQL**, **React** (with TypeScript, Vite and Chakra UI) and **Docker Compose**. It includes utilities to estimate German net salary and IG Metall tariff incomes.

## Development

Requirements: Docker and Docker Compose.

Start the stack for development:

```bash
docker compose up --build
```

The backend will be available at `http://localhost:8878`, the frontend at `http://localhost:8877` via Traefik.

Run tests locally with:

```bash
pip install -r backend/requirements.txt
pytest backend/tests
```
