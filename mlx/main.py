from fastapi import FastAPI
from routes.model import router as model_router
from routes.chat import router as chat_router

app = FastAPI()

app.include_router(model_router, prefix="/models", tags=["model"])
app.include_router(model_router, prefix="/v1/models", tags=["model"])
app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(chat_router, prefix="/v1/chat", tags=["chat"])
