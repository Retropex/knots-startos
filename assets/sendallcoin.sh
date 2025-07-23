#!/bin/sh

set -e
set -o pipefail

cli="bitcoin-cli $1 $2 $3"

if ! $cli listwalletdir | jq -e '.wallets[] | select(.name == "coin")' &> /dev/null; then
	$cli createwallet "coin" &> /dev/null
fi

if ! $cli getwalletinfo &> /dev/null; then
    $cli loadwallet coin &> /dev/null
fi

$cli -named sendall recipients="[\"$4\"]" fee_rate=$5 | jq -r '.txid'