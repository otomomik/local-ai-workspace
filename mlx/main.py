from fastapi import FastAPI
from routes.model import router as model_router

app = FastAPI()

app.include_router(model_router, prefix="/models")
