from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.routers import upload, summary, market, financial, services

app = FastAPI()\

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
