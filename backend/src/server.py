"""Server.
"""
from typing import Final

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.routers import auth, upload, summary, market, financial, services
from src.core.services import firebase_client


TITLE: Final[str] = 'Granite API'
VERSION: Final[str] = '0.4.3'

app = FastAPI(title=TITLE, version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(summary.router)
app.include_router(market.router)
app.include_router(financial.router)
app.include_router(services.router)
app.include_router(auth.router)

@app.on_event("startup")
def startup_event():
    firebase_client.FirebaseClient.initialize_firebase()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
