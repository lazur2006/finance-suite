# Finance Suite

This is a minimal full-stack example using **FastAPI**, **SQLModel**, **PostgreSQL**, **React** (with TypeScript, Vite and Chakra UI) and **Docker Compose**. It includes utilities to estimate German net salary and IG Metall tariff incomes.

## Development

Requirements: Docker and Docker Compose.

Start the stack for development:

```bash
docker-compose up --build
```

The stack exposes Traefik on port `8877`. Access the frontend at `http://localhost:8877` and the backend directly at `http://localhost:8878` (or via Traefik under `/api`).

Run tests locally with:

```bash
pip install -r backend/requirements.txt
pytest backend/tests
```
