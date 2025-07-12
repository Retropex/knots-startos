#!/bin/sh

set -e

cli="/opt/bitcoin/bin/bitcoin-cli $1 $2 $3"

if ! $cli listwalletdir | jq -e '.wallets[] | select(.name == "coin")' &> /dev/null; then
	$cli createwallet "coin" &> /dev/null
fi

if ! $cli getwalletinfo &> /dev/null; then
    $cli loadwallet coin &> /dev/null
fi

bitcoin-cli signmessage "$4" "$5"