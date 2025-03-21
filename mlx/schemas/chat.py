from typing import Dict, List, Literal, Optional, Union
from pydantic import BaseModel


class _Message(BaseModel):
    role: Literal["developer", "system", "user", "assistant"]
    content: Optional[Union[str, List[Dict[str, Union[str, Dict[str, str]]]]]] = None
    name: Optional[str] = None


class ChatCompletionsRequest(BaseModel):
    model: str
    messages: List[_Message]
    max_completion_tokens: Optional[int] = None
    stream: Optional[bool] = False
    temperature: float = 1.0
    top_p: float = 1.0
