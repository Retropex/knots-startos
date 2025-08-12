FROM debian:bookworm-20230904-slim AS bitcoin-knots
ENV DEBIAN_FRONTEND=noninteractive
RUN \
  --mount=type=cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,target=/var/lib/apt,sharing=locked \
  --mount=type=bind,source=./repro-sources-list.sh,target=/usr/local/bin/repro-sources-list.sh \
  repro-sources-list.sh && \
  apt-get update && \
  apt-get install -y gpg wget curl jq && \
  : "Clean up for improving reproducibility (optional)" && \
  rm -rf /var/log/* /var/cache/ldconfig/aux-cache

ARG ARCH
ARG PLATFORM=${ARCH/aarch64/arm64}
ARG PLATFORM=${PLATFORM/x86_64/amd64}
ARG VERSION=28.1.knots20250305
ARG TARGETPLATFORM
ARG SOURCE_DATE_EPOCH

WORKDIR /build

RUN echo "Deriving tarball name from \$TARGETPLATFORM" && \
  case "${TARGETPLATFORM}" in \
    "linux/amd64")  echo "bitcoin-${VERSION}-x86_64-linux-gnu.tar.gz"    > /tarball-name ;; \
    "linux/arm64")  echo "bitcoin-${VERSION}-aarch64-linux-gnu.tar.gz"   > /tarball-name ;; \
    *) echo "Unsupported platform: ${TARGETPLATFORM}" && exit 1 ;; \
  esac && \
  echo "Tarball name: $(cat /tarball-name)"

RUN echo "Downloading release assets"
RUN wget --no-use-server-timestamps https://bitcoinknots.org/files/28.x/28.1.knots20250305/$(cat /tarball-name)
RUN wget --no-use-server-timestamps https://bitcoinknots.org/files/28.x/28.1.knots20250305/SHA256SUMS

COPY ./gpg-keys.txt /build/
COPY ./SHA256SUMS.asc /build/

RUN echo "Verifying PGP signatures"
RUN gpg --import gpg-keys.txt
RUN gpg --verify SHA256SUMS.asc SHA256SUMS
RUN echo "PGP signature verification passed"

RUN echo "Verifying checksums"
RUN [ -f SHA256SUMS ] && cp SHA256SUMS /sha256sums
RUN grep $(cat /tarball-name) /sha256sums | sha256sum -c
RUN echo "Checksums verified ok"

RUN echo "Extracting release assets"
RUN tar -zxvf $(cat /tarball-name) --strip-components=1

FROM debian:bookworm-slim@sha256:2424c1850714a4d94666ec928e24d86de958646737b1d113f5b2207be44d37d8

ARG ARCH
ARG VERSION=28.1.knots20250305
ARG SOURCE_DATE_EPOCH

ENV BITCOIN_DATA=/root/.bitcoin
ENV BITCOIN_PREFIX=/opt/bitcoin
ENV PATH=${BITCOIN_PREFIX}/bin:$PATH

COPY --from=bitcoin-knots /build/bin /opt/bitcoin/bin

EXPOSE 8332 8333