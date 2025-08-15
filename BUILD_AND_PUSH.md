# change both the image name and the login user

export IMAGE=ghcr.io/trycactus/presenton:0.0.2 # pick any tag you like

# authenticate once (PAT with write:packages scope)

export GHCR_TOKEN=ghp....

echo "$GHCR_TOKEN" | docker login ghcr.io -u trycactus --password-stdin

# build the container

docker build -t "$IMAGE" .

# push it up

#docker push "$IMAGE"

# (Apple-silicon users who need an amd64 image for Railway can do:)

docker buildx build --platform linux/amd64 -t "$IMAGE" --push .
