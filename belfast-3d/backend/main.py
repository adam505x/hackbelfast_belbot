"""Belfast 3D City Intelligence Platform — FastAPI Backend"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import scoring, rag, flood, deprivation
from services.vector_store import init_vector_store

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialise vector store for RAG."""
    init_vector_store()
    yield


app = FastAPI(
    title="Belfast 3D Intelligence API",
    version="1.0.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scoring.router, prefix="/api/scoring", tags=["scoring"])
app.include_router(rag.router, prefix="/api/rag", tags=["rag"])
app.include_router(flood.router, prefix="/api/flood", tags=["flood"])
app.include_router(deprivation.router, prefix="/api/deprivation", tags=["deprivation"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "belfast-3d-api"}
