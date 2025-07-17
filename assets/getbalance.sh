#!/bin/sh

set -e

cli="bitcoin-cli $1 $2 $3"

if ! $cli listwalletdir | jq -e '.wallets[] | select(.name == "coin")' &> /dev/null; then
	$cli createwallet "coin" &> /dev/null
fi

if ! $cli getwalletinfo &> /dev/null; then
    $cli loadwallet coin &> /dev/null
fi

TRUSTED=$($cli getbalances | jq -r '.mine.trusted')
UNTRUSTED=$($cli getbalances | jq -r '.mine.untrusted_pending')
IMMATURE=$($cli getbalances | jq -r '.mine.immature')

echo -e "trusted: $TRUSTED\nuntrusted: $UNTRUSTED\nimmature: $IMMATURE"