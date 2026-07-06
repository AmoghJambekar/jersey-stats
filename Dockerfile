# Frontend build
FROM node:22-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Backend build
FROM golang:1.25-alpine AS build
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@v1.28.0
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN sqlc generate
RUN go build -o /api ./cmd/api

# Run stage
FROM alpine:3.21
COPY --from=build /api /api
COPY --from=frontend /app/dist /public
EXPOSE 8080
CMD ["/api"]
