import json
import importlib
from typing import Dict, List, Optional, Union
from fastapi import APIRouter
from huggingface_hub import HFCacheInfo, scan_cache_dir

from schemas.model import Model

router = APIRouter()

cache_dir: Optional[HFCacheInfo] = None


def get_cache_dir():
    global cache_dir
    if cache_dir is None:
        cache_dir = scan_cache_dir()
    return cache_dir


@router.get("/")
def chat_completions():
    supported_models: List[Model] = []

    for repo in get_cache_dir().repos:
        if repo.repo_type != "model":
            continue

        first_revision = next(iter(repo.revisions), None)
        if not first_revision:
            continue

        config_file = next(
            (f for f in first_revision.files if f.file_name == "config.json"), None
        )
        if not config_file:
            continue

        # try:
        #     with open(config_file.file_path, "r") as f:
        #         config_data = json.load(f)
        # except Exception:
        #     continue

        # is_text = False
        # try:
        #     importlib.import_module(f"mlx_lm.models.{config_data['model_type']}")
        #     is_text = True
        # except Exception:
        #     pass

        # is_image = False
        # try:
        #     importlib.import_module(f"mlx_vlm.models.{config_data['model_type']}")
        #     is_image = True
        # except Exception:
        #     pass

        supported_models.append(
            Model(
                id=repo.repo_id,
                created=int(repo.last_modified),
                owned_by=repo.repo_id.split("/")[0]
                if "/" in repo.repo_id
                else repo.repo_id,
            )
        )

    return {"object": "list", "data": supported_models}
