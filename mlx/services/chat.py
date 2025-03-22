import time
from typing import Union
import uuid
import platform
import json
from fastapi import HTTPException
import mlx.core as mx
from mlx_lm.utils import load, generate, stream_generate
from mlx_lm.sample_utils import make_sampler

from schemas.chat import ChatCompletionsRequest
from services.model import model_service
from _version import __version__


class ChatService:
    def __init__(self, request: ChatCompletionsRequest):
        self.id = f"chatcmpl-{uuid.uuid4()}"
        self.created = int(time.time())
        self.system_fingerprint = self._get_system_fingerprint()

        self.request = request
        using_model = model_service.get_model(request.model)
        if using_model is None:
            raise ValueError(f"Model {request.model} not found.")

        self.using_model = using_model

    def generate(self):
        # if self.using_model.image_to_text or self.using_model.video_to_text:
        #     raise HTTPException(
        #         status_code=400, detail=f"Model {self.request.model} not supported."
        #     )

        return self._text_generate()

    def generate_stream(self):
        # if self.using_model.image_to_text or self.using_model.video_to_text:
        #     raise HTTPException(
        #         status_code=400, detail=f"Model {self.request.model} not supported."
        #     )

        return self._text_generate_stream()

    def _get_system_fingerprint(self):
        gpu_arch = (
            mx.metal.device_info()["architecture"] if mx.metal.is_available() else ""
        )
        return f"{__version__}-{platform.platform()}-{gpu_arch}"

    def _response(
        self, generated_text: Union[str, None], finish_reason: Union[str, None]
    ):
        object = "chat.completion.chunk" if self.request.stream else "chat.completion"
        usage = (
            {}
            if self.request.stream
            else {
                "usage": {
                    "completion_tokens": 0,
                    "prompt_tokens": 0,
                    "total_tokens": 0,
                }
            }
        )
        choices = [
            {
                "index": 0,
                "finish_reason": finish_reason,
            }
        ]

        if self.request.stream:
            choices[0]["delta"] = (
                {
                    "content": generated_text,
                    "role": "assistant",
                }
                if generated_text is not None
                else {}
            )
        else:
            choices[0]["message"] = {
                "content": generated_text or "",
                "role": "assistant",
            }

        return {
            "id": self.id,
            "created": self.created,
            "model": self.request.model,
            "system_fingerprint": self.system_fingerprint,
            "object": object,
            "choices": choices,
        } | usage

    def _make_sampler(self):
        return make_sampler(temp=self.request.temperature, top_p=self.request.top_p)

    def _text_generate(self):
        model, tokenizer = load(self.request.model)
        prompt = tokenizer._tokenizer.apply_chat_template(
            self.request.messages, add_generation_prompt=True
        )
        sampler = self._make_sampler()
        generated_text = generate(
            model,
            tokenizer,
            prompt=prompt,
            sampler=sampler,
            max_tokens=self.request.max_completion_tokens,
        )
        return self._response(generated_text, "stop")

    def _text_generate_stream(self):
        model, tokenizer = load(self.request.model)
        prompt = tokenizer._tokenizer.apply_chat_template(
            self.request.messages, add_generation_prompt=True
        )
        sampler = self._make_sampler()
        for generated_chunk in stream_generate(
            model,
            tokenizer,
            prompt=prompt,
            sampler=sampler,
            max_tokens=self.request.max_completion_tokens,
        ):
            yield f"data: {json.dumps(self._response(generated_chunk.text, None))}\n\n"

        yield f"data: {json.dumps(self._response(None, 'stop'))}\n\n"
