from pydantic import BaseModel


class Model(BaseModel):
    id: str
    object: str = "model"
    created: int
    owned_by: str
