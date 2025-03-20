import json
import importlib
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from huggingface_hub import HFCacheInfo, scan_cache_dir
from mlx_lm.utils import MODEL_REMAPPING as LM_MODEL_REMAPPING
from mlx_vlm.utils import MODEL_REMAPPING as VL_MODEL_REMAPPING

from schemas.model import Model


router = APIRouter()

cache_dir: Optional[HFCacheInfo] = None
cache_models: Optional[List[Model]] = None


def get_cache_dir():
    global cache_dir
    if cache_dir is None:
        cache_dir = scan_cache_dir()
    return cache_dir


def _get_models():
    global cache_models
    if cache_models is None:
        cache_models = []
        for repo in get_cache_dir().repos:
            model = _get_model(repo.repo_id)

            if model is not None:
                cache_models.append(model)

    return cache_models


def _get_model(model_id: str):
    for repo in get_cache_dir().repos:
        id = repo.repo_id
        type = repo.repo_type
        if model_id != repo.repo_id:
            continue

        if "mlx" not in id:
            continue

        if type != "model":
            continue

        revisions = repo.revisions
        first_revision = next(iter(revisions), None)
        if not first_revision:
            continue

        config_file = next(
            (f for f in first_revision.files if f.file_name == "config.json"), None
        )
        if not config_file:
            continue

        try:
            with open(config_file.file_path, "r") as f:
                config_data = json.load(f)
        except Exception:
            continue

        text_to_text = False
        image_to_text = False
        video_to_text = False
        model_type = config_data.get("model_type")

        text_model_type = LM_MODEL_REMAPPING.get(model_type, model_type)
        try:
            importlib.import_module(f"mlx_lm.models.{text_model_type}")
            text_to_text = True
        except Exception:
            logging.debug(f"Model type {text_model_type} not text_to_text supported.")

        image_model_type = VL_MODEL_REMAPPING.get(model_type, model_type)
        try:
            importlib.import_module(f"mlx_vlm.models.{image_model_type}")
            text_to_text = True
            image_to_text = True
        except Exception:
            logging.debug(f"Model type {image_model_type} not image_to_text supported.")

        try:
            video_to_text = hasattr(config_data, "video_token_id") or hasattr(
                config_data, "video_token_index"
            )
            if video_to_text:
                text_to_text = True
        except Exception:
            logging.debug(f"Model type {image_model_type} not video_to_text supported.")

        last_modified = repo.last_modified
        return Model(
            id=id,
            created=int(last_modified),
            owned_by=id.split("/")[0] if "/" in id else id,
            text_to_text=text_to_text,
            image_to_text=image_to_text,
            video_to_text=video_to_text,
        )

    return None


@router.get("/")
def get_models():
    models = _get_models()
    return {"object": "list", "data": models}


@router.get("/{model_id:path}")
def get_model(model_id: str):
    models = _get_models()
    for model in models:
        if model.id == model_id:
            return model

    raise HTTPException(status_code=404, detail="Model not found")
