# Build stage
FROM debian:stable-slim AS builder

ARG VERSION
ARG PATH_VERSION
ARG TARGETPLATFORM

WORKDIR /build

RUN apt-get update && apt-get install -y wget pgp ca-certificates

# Pinned Bitcoin Knots release signers. Build requires REQUIRED_QUORUM
# DISTINCT signers from this set; not every signer signs every release,
# which is why the gate is a quorum rather than all of them. Adding a
# signer here is an explicit trust decision — do not delegate to
# upstream key directories or keyservers.
#
# This list must stay in lockstep with assets/release-keys/: the build
# asserts the imported keyring is exactly this set, so a key file with no
# fingerprint here — or a fingerprint here with no key file — fails the
# build rather than silently widening or narrowing who can sign.
ENV PINNED_FINGERPRINTS="\
1A3E761F19D2CC7785C5502EA291A2C45D0C504A \
1D5889CB9E0564C154E18BB512EC9519DB43CC27 \
658E64021E5793C6C4E15E45C2E581F5B998F30E \
83BB550EBD429F9D5133F910D4D746D66204CA41 \
95636F3538D9262765AB29BEE952E584CA8C0F45 \
A47D99B6DB0D715D40C59A2023AE8A8EA7E24E38 \
DAED928C727D3E613EC46635F5073C4F4882FFFC"
ENV REQUIRED_QUORUM=1

RUN case "${TARGETPLATFORM}" in \
      "linux/amd64")   echo "bitcoin-${VERSION}rc4-x86_64-linux-gnu.tar.gz"    > /tarball-name ;; \
      "linux/arm64")   echo "bitcoin-${VERSION}rc4-aarch64-linux-gnu.tar.gz"   > /tarball-name ;; \
      "linux/riscv64") echo "bitcoin-${VERSION}rc4-riscv64-linux-gnu.tar.gz"   > /tarball-name ;; \
      *) echo "Unsupported platform: ${TARGETPLATFORM}" && exit 1 ;; \
    esac

RUN wget https://test.bitcoinknots.org/~luke-jr/programs/bitcoin/files/bitcoin-knots/${PATH_VERSION}/${VERSION}/test/rc4/$(cat /tarball-name) \
         https://test.bitcoinknots.org/~luke-jr/programs/bitcoin/files/bitcoin-knots/${PATH_VERSION}/${VERSION}/test/rc4/SHA256SUMS.asc \
         https://test.bitcoinknots.org/~luke-jr/programs/bitcoin/files/bitcoin-knots/${PATH_VERSION}/${VERSION}/test/rc4/SHA256SUMS

COPY assets/release-keys/ /tmp/release-keys/

# Verify SHA256SUMS.asc against the pinned signer set.
#
# The quorum counts DISTINCT signers, identified by primary fingerprint. GnuPG
# emits one status line per signature PACKET, so counting packets would let a
# single compromised key satisfy the quorum by signing REQUIRED_QUORUM times,
# leaving no tolerance at all for a compromised signer. VALIDSIG's last field is
# the signing key's primary fingerprint, so a signature made by a subkey rolls
# up to the signer that owns it.
#
# A VALIDSIG alone is not enough to count: GnuPG also emits one for a signature
# by an expired or revoked key, pairing it with EXPKEYSIG/REVKEYSIG instead of
# GOODSIG. Knots releases carry such a signature today, and counting it would be
# laxer than what this replaced, so the walk below only counts a VALIDSIG whose
# signature reported GOODSIG.
#
# The keyring is asserted equal to the pinned primaries first, so the count can
# be taken over the keyring as a whole: a stray key dropped into
# assets/release-keys/ fails the build rather than voting in the quorum.
#
# gpg's exit code is unusable here: GnuPG 2.4+ returns non-zero for ERRSIG
# (signatures by signers outside the keyring) even when the pinned-key
# signatures verified fine.
RUN set -e; \
    export LC_ALL=C; \
    gpg --import /tmp/release-keys/*.asc; \
    rm -rf /tmp/release-keys; \
    : > /tmp/pinned-primaries.raw; \
    for fp in ${PINNED_FINGERPRINTS}; do \
        gpg --with-colons --list-keys "$fp" 2>/dev/null \
          | awk -F: '/^fpr:/{print $10; exit}' >> /tmp/pinned-primaries.raw; \
    done; \
    sort -u /tmp/pinned-primaries.raw > /tmp/pinned-primaries; \
    expected=$(echo ${PINNED_FINGERPRINTS} | wc -w); \
    if [ "$(wc -l < /tmp/pinned-primaries)" -ne "${expected}" ]; then \
        echo "PINNED KEY MISSING OR DUPLICATED (expected ${expected} distinct primaries)"; exit 1; \
    fi; \
    gpg --with-colons --list-keys \
      | awk -F: '/^pub:/{p=1} p && /^fpr:/{print $10; p=0}' | sort -u > /tmp/keyring-primaries; \
    if ! diff -q /tmp/pinned-primaries /tmp/keyring-primaries >/dev/null; then \
        echo "KEYRING CONTAINS KEYS OUTSIDE THE PINNED SET"; exit 1; \
    fi; \
    gpg --verify --status-fd 1 SHA256SUMS.asc SHA256SUMS 2>/dev/null > /tmp/gpg-status || true; \
    bad=$(grep -c '^\[GNUPG:\] BADSIG' /tmp/gpg-status || true); \
    signers=$(awk '/^\[GNUPG:\] NEWSIG/{g=0} /^\[GNUPG:\] GOODSIG/{g=1} /^\[GNUPG:\] VALIDSIG/{if(g)print $NF; g=0}' /tmp/gpg-status \
      | grep -Ex '[0-9A-F]{40}' | sort -u | comm -12 - /tmp/pinned-primaries | wc -l); \
    skipped=$(grep -cE '^\[GNUPG:\] (EXPKEYSIG|REVKEYSIG)' /tmp/gpg-status || true); \
    echo "Distinct pinned signers: ${signers}, bad: ${bad}, uncounted (expired/revoked key): ${skipped} (need ${REQUIRED_QUORUM}, 0)"; \
    if [ "${bad}" -ne 0 ]; then echo "BAD SIGNATURE FROM PINNED KEY"; exit 1; fi; \
    if [ "${signers}" -lt "${REQUIRED_QUORUM}" ]; then echo "INSUFFICIENT QUORUM"; exit 1; fi

RUN cp SHA256SUMS /sha256sums
RUN grep $(cat /tarball-name) /sha256sums | sha256sum -c

RUN tar -zxvf $(cat /tarball-name) --strip-components=1

# Final image
FROM debian:stable-slim

ENV BITCOIN_DATA=/root/.bitcoin
ENV BITCOIN_PREFIX=/opt/bitcoin
ENV PATH=${BITCOIN_PREFIX}/bin:$PATH

# curl is load-bearing: the assumeutxo action shells out to it in this image
# to download the UTXO snapshot.
RUN apt-get update && apt-get install -y curl e2fsprogs jq yq

COPY --from=builder /build/bin/bitcoind ${BITCOIN_PREFIX}/bin/
COPY --from=builder /build/bin/bitcoin-cli ${BITCOIN_PREFIX}/bin/

ARG ARCH

EXPOSE 8332 8333