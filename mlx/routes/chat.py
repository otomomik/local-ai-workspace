from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from schemas.chat import ChatCompletionsRequest

from services.chat import ChatService

router = APIRouter()


@router.post("/completions")
def chat_completions(request: ChatCompletionsRequest):
    try:
        chat_completions_service = ChatService(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if request.stream:
        return StreamingResponse(
            content=chat_completions_service.generate_stream(),
            media_type="text/event-stream",
        )

    return chat_completions_service.generate()
