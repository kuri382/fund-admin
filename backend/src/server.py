"""Server.
"""

from typing import Final
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.routers import auth, data, explorer, image, parameter, project, projection, retriever, upload, worker
from src.core.services import firebase_client
from src.settings import settings

TITLE: Final[str] = 'Granite API'
VERSION: Final[str] = '1.0.0'

@asynccontextmanager
async def lifespan(app: FastAPI):
    # スタートアップ時に行いたい処理
    firebase_client.FirebaseClient.initialize_firebase()

    # アプリケーション起動
    yield

    # シャットダウン時に必要なら行う処理は以降

app = FastAPI(
    title=TITLE,
    version=VERSION,
    docs_url="/docs" if settings.api_docs.enable_docs else None,
    redoc_url="/redoc" if settings.api_docs.enable_redoc else None,
    lifespan=lifespan,
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
app.include_router(projection.router)
app.include_router(retriever.router)
app.include_router(upload.router)
app.include_router(worker.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
