"""Server.
"""
from typing import Final

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.routers import (
    auth,
    data,
    explorer,
    image,
    parameter,
    project,
    summary,
    upload,
)
from src.core.services import firebase_client
from src.settings import settings


TITLE: Final[str] = 'Granite API'
VERSION: Final[str] = '0.4.6'

app = FastAPI(
    title=TITLE,
    version=VERSION,
    docs_url="/docs" if settings.api_docs.enable_docs else None,
    redoc_url="/redoc" if settings.api_docs.enable_redoc else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(data.router)
app.include_router(explorer.router)
app.include_router(image.router)
app.include_router(parameter.router)
app.include_router(project.router)
app.include_router(summary.router)
app.include_router(upload.router)


@app.on_event("startup")
def startup_event():
    firebase_client.FirebaseClient.initialize_firebase()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
