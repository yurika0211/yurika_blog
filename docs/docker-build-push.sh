#!/bin/bash
# Docker Build & Push to Docker Hub
# Usage: bash docs/docker-build-push.sh
# Prerequisites: docker login

set -e

DOCKER_USER="shiokou"
TAG="latest"

IMAGES=(
  "my-blog:./my-blog"
  "my-blog-backend:./my-blog-backend"
  "chat-ai:./chat-ai"
)

echo "=== Step 1: Build all images ==="
for entry in "${IMAGES[@]}"; do
  NAME="${entry%%:*}"
  CONTEXT="${entry#*:}"
  echo ""
  echo "--- Building ${DOCKER_USER}/${NAME}:${TAG} from ${CONTEXT} ---"
  docker build --no-cache -t "${DOCKER_USER}/${NAME}:${TAG}" "${CONTEXT}"
  echo "--- ${NAME} build completed ---"
done

echo ""
echo "=== Step 2: Verify built images ==="
docker images | grep "${DOCKER_USER}"

echo ""
echo "=== Step 3: Push all images to Docker Hub ==="
for entry in "${IMAGES[@]}"; do
  NAME="${entry%%:*}"
  echo ""
  echo "--- Pushing ${DOCKER_USER}/${NAME}:${TAG} ---"
  docker push "${DOCKER_USER}/${NAME}:${TAG}"
  echo "--- ${NAME} push completed ---"
done

echo ""
echo "=== All done! ==="
echo "Pushed images:"
for entry in "${IMAGES[@]}"; do
  NAME="${entry%%:*}"
  echo "  - ${DOCKER_USER}/${NAME}:${TAG}"
done
