# Running and Deploying Presenton Locally

This guide covers how to run your local Presenton code with modifications, including the embedded functionality.

## 🚢 Build and Push to GitHub Container Registry

### Set your image name and tag

`export IMAGE=ghcr.io/trycactus/presenton:0.0.3  # Update version as needed`

# Set your GitHub token (needs write:packages scope)

`export GHCR_TOKEN=ghp_your_token_here`

### Login to GitHub Container Registry

`echo "$GHCR_TOKEN" | docker login ghcr.io -u trycactus --password-stdin`

### Build the container

`docker build -t "$IMAGE" .`

### Push it to the registry

`docker push "$IMAGE"`

### 🍎 For M4 Mac (Building AMD64 for servers)

If you need an AMD64 image for deployment on Linux servers:

Build and push AMD64 image for server compatibility
`docker buildx build --platform linux/amd64 -t "$IMAGE" --push .`

## 🚀 Development Workflow

Create a .env at the root of the project at presenton/ with the below:

```
OPENAI_API_KEY=sk-...
LLM=openai
IMAGE_PROVIDER=dall-e-3
DISABLE_ANONYMOUS_TELEMETRY=true
CAN_CHANGE_KEYS=false
```

Run docker command:
`docker compose up development --build`
