from fastapi import FastAPI
from routes.model import router as model_router
from routes.chat import router as chat_router

app = FastAPI()

app.include_router(model_router, prefix="/models")
app.include_router(model_router, prefix="/v1/models")
app.include_router(chat_router, prefix="/chat")
app.include_router(chat_router, prefix="/v1/chat")
