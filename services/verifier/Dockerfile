FROM golang:1.27-alpine AS builder
WORKDIR /src
COPY go.mod ./
COPY . .
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} go build -trimpath -ldflags="-s -w" -o /out/apivault-verifier ./cmd/verifier

FROM alpine:3.24
RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S verifier \
    && adduser -S verifier -G verifier
COPY --from=builder --chown=verifier:verifier /out/apivault-verifier /usr/local/bin/apivault-verifier
USER verifier
EXPOSE 8081
ENTRYPOINT ["/usr/local/bin/apivault-verifier"]
