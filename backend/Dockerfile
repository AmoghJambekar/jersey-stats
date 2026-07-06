# Build stage
FROM golang:1.25-alpine AS build
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN sqlc generate
RUN go build -o /api ./cmd/api

# Run stage
FROM alpine:3.21
COPY --from=build /api /api
EXPOSE 8080
CMD ["/api"]
