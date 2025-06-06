# Development

## Run
```bash
poetry run uvicorn src.server:app --workers 4
# debug
poetry run uvicorn src.server:app --reload --log-level debug
```

## Lint
```sh
poetry run black .
poetry run isort .
poetry run ruff check
poetry run ruff format
```

# Deployment

## Settings
```
gcloud auth login
gcloud auth application-default login
gcloud config set project granite
```

```sh
poetry export -f requirements.txt --output requirements.txt
```

## Container Deployment
```sh
DOMAIN="gcr.io"
PROJECT="granite-dev-432613"
REPOSITORY="granite-registry"
NAME="granite-dev"
VERSION=

TAG=${DOMAIN}/${PROJECT}/${REPOSITORY}/${NAME}:${VERSION}
docker buildx build --platform linux/amd64 --tag ${TAG} .
docker push ${TAG}
```
