from typing import Optional
from pydantic import BaseModel


class Model(BaseModel):
    id: str
    object: str = "model"
    created: int
    owned_by: str
    text_to_text: bool
    image_to_text: bool
    video_to_text: bool
