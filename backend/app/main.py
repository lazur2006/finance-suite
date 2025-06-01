
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router
from .database import init_db

# ---------------------------------------------------------------------------
# initialise DB schema once at process start-up
# ---------------------------------------------------------------------------
init_db()

app = FastAPI(title="Finance Suite API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Finance Suite API"}

