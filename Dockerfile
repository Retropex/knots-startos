# Build stage
FROM debian:stable-slim AS builder

ARG VERSION
ARG TARGETPLATFORM

WORKDIR /build

RUN echo "Installing build deps"
RUN apt-get update
RUN apt-get install -y wget pgp curl jq

RUN echo "Deriving tarball name from \$TARGETPLATFORM" && \
    case "${TARGETPLATFORM}" in \
      "linux/amd64")   echo "bitcoin-${VERSION}-x86_64-linux-gnu.tar.gz"    > /tarball-name ;; \
      "linux/arm64")   echo "bitcoin-${VERSION}-aarch64-linux-gnu.tar.gz"   > /tarball-name ;; \
      "linux/riscv64") echo "bitcoin-${VERSION}-riscv64-linux-gnu.tar.gz"   > /tarball-name ;; \
      *) echo "Unsupported platform: ${TARGETPLATFORM}" && exit 1 ;; \
    esac && \
    echo "Tarball name: $(cat /tarball-name)"

RUN echo "Downloading release assets"
RUN wget https://bitcoinknots.org/files/29.x/29.3.knots20260210/$(cat /tarball-name)
RUN wget https://bitcoinknots.org/files/29.x/29.3.knots20260210/SHA256SUMS.asc
RUN wget https://bitcoinknots.org/files/29.x/29.3.knots20260210/SHA256SUMS
RUN echo "Downloaded release assets:" && ls

RUN echo "Verifying PGP signatures"
RUN curl -s "https://api.github.com/repos/bitcoinknots/guix.sigs/contents/builder-keys" | jq -r '.[].download_url' | while read url; do curl -s "$url" | gpg --import; done
RUN gpg --verify SHA256SUMS.asc SHA256SUMS
RUN echo "PGP signature verification passed"

RUN echo "Verifying checksums"
RUN [ -f SHA256SUMS ] && cp SHA256SUMS /sha256sums || cp SHA256SUMS.asc /sha256sums
RUN grep $(cat /tarball-name) /sha256sums | sha256sum -c
RUN echo "Checksums verified ok"

RUN echo "Extracting release assets"
RUN tar -zxvf $(cat /tarball-name) --strip-components=1

# Final image
FROM debian:stable-slim

ENV BITCOIN_DATA=/root/.bitcoin
ENV BITCOIN_PREFIX=/opt/bitcoin
ENV PATH=${BITCOIN_PREFIX}/bin:$PATH

RUN apt update

RUN apt install -y curl e2fsprogs jq yq 

COPY --from=builder /build/bin/bitcoind ${BITCOIN_PREFIX}/bin/
COPY --from=builder /build/bin/bitcoin-cli ${BITCOIN_PREFIX}/bin/

ARG ARCH

EXPOSE 8332 8333