#!/bin/bash

CONTAINER_NAME=local_ai_workspace_postgres

docker image inspect "${CONTAINER_NAME}" >/dev/null 2>&1 && echo "Container ${CONTAINER_NAME} already exists" || docker build -t "${CONTAINER_NAME}" .
docker run --rm -p "$POSTGRES_PORT":5432 --name "${CONTAINER_NAME}" -v ./data:/var/lib/postgresql/data -e POSTGRES_USER="$POSTGRES_USER" -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" -e POSTGRES_DB="$POSTGRES_DB" -e PGDATA="$PGDATA" "${CONTAINER_NAME}"
