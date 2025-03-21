from fastapi import APIRouter, HTTPException

from services.model import model_service


router = APIRouter()


@router.get("/")
def get_models():
    models = model_service.get_models()
    return {"object": "list", "data": models}


@router.get("/{model_id:path}")
def get_model(model_id: str):
    model = model_service.get_model(model_id)
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")

    return model
