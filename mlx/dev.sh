#!/bin/bash

IS_EXIST_VENV=false
if [ ! -e .venv ]; then
  python -m venv .venv
  IS_EXIST_VENV=true
fi

source .venv/bin/activate

if "${IS_EXIST_VENV}"; then
  pip install -r requirements.txt
fi

mlx-omni-server --port "$MLX_PORT"
