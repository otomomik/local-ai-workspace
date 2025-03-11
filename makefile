init: init-docker init-mlx

init-docker:
	docker compose build --no-cache --force-rm

init-mlx:
	rm -rf mlx/.venv && python -m venv mlx/.venv && source mlx/.venv/bin/activate && pip install -r mlx/requirements.txt

dev: dev-mlx

dev-mlx:
	source mlx/.venv/bin/activate && mlx-omni-server
