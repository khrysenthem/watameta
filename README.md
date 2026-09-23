Watameta is my attempt at Asteroid technical test, let's have fun!

## Running the API in Docker

```
docker build -t watameta-api .

docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/watameta" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_GOOGLE_ID="..." \
  -e AUTH_GOOGLE_SECRET="..." \
  watameta-api
```

All four env vars are required at runtime (none are baked into the image).
Migrations aren't run by the image — apply them separately (`npm run migrate`)
against the target `DATABASE_URL` before starting the container.

## Cloud deployment

AWS CDK (development + production environments): see [`cloud/aws`](cloud/aws).
