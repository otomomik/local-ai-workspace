import time
from typing import Union
import uuid
import platform
import json
import mlx.core as mx
import mlx_lm.utils as lm_utils
import mlx_lm.sample_utils as lm_sample_utils
import mlx_vlm.utils as vlm_utils
import mlx_vlm.prompt_utils as vlm_prompt_utils

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
        if self.using_model.image_to_text or self.using_model.video_to_text:
            return self._vision_generate()

        return self._text_generate()

    def generate_stream(self):
        if self.using_model.image_to_text or self.using_model.video_to_text:
            return self._vision_generate_stream()

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
        return lm_sample_utils.make_sampler(
            temp=self.request.temperature, top_p=self.request.top_p
        )

    def _text_generate(self):
        model, tokenizer = lm_utils.load(self.request.model)
        prompt = tokenizer._tokenizer.apply_chat_template(
            self.request.messages, add_generation_prompt=True
        )
        sampler = self._make_sampler()
        # streamを使用してtokenの計算を行う
        generated_text = lm_utils.generate(
            model,
            tokenizer,
            prompt=prompt,
            sampler=sampler,
            max_tokens=self.request.max_completion_tokens,
        )
        print(generated_text)
        return self._response(generated_text, "stop")

    def _text_generate_stream(self):
        model, tokenizer = lm_utils.load(self.request.model)
        prompt = tokenizer._tokenizer.apply_chat_template(
            self.request.messages, add_generation_prompt=True
        )
        sampler = self._make_sampler()
        for generated_chunk in lm_utils.stream_generate(
            model,
            tokenizer,
            prompt=prompt,
            sampler=sampler,
            max_tokens=self.request.max_completion_tokens,
        ):
            # TODO finish_reason, usage_tokenの取得
            print(generated_chunk)
            yield f"data: {json.dumps(self._response(generated_chunk.text, None))}\n\n"

        yield f"data: {json.dumps(self._response(None, 'stop'))}\n\n"

    def _vision_generate(self):
        model, tokenizer = vlm_utils.load(self.request.model)
        config = vlm_utils.load_config(self.request.model)
        images = []
        prompt = vlm_prompt_utils.apply_chat_template(
            tokenizer,
            config,
            self.request.messages,
            num_images=len(images),
            add_generation_prompt=True,
        )

        # streamを使用してtokenの計算を行う
        generated_text = vlm_utils.generate(
            model,
            tokenizer,
            prompt,
            images,
            max_tokens=self.request.max_completion_tokens,
            temperature=self.request.temperature,
            top_p=self.request.top_p,
        )
        return self._response(generated_text, "stop")

    def _vision_generate_stream(self):
        model, tokenizer = vlm_utils.load(self.request.model)
        config = vlm_utils.load_config(self.request.model)
        images = []
        prompt = vlm_prompt_utils.apply_chat_template(
            tokenizer,
            config,
            [message.dict() for message in self.request.messages],
            num_images=len(images),
            add_generation_prompt=True,
        )

        for generated_chunk in vlm_utils.stream_generate(
            model,
            tokenizer,
            prompt,
            images,
            max_tokens=self.request.max_completion_tokens,
            temperature=self.request.temperature,
            top_p=self.request.top_p,
        ):
            # TODO finish_reason, usage_tokenの取得
            print(generated_chunk)
            yield f"data: {json.dumps(self._response(generated_chunk.text, None))}\n\n"

        yield f"data: {json.dumps(self._response(None, 'stop'))}\n\n"
