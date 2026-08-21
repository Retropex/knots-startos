# Bitcoin Knots (RDTS)

## Documentation

- [Start9 Bitcoin guides](https://docs.start9.com/bitcoin-guides/) — operating-a-Bitcoin-node guides curated for StartOS users (connecting wallets, dependent services, common workflows).
- [About Bitcoin Knots](https://bitcoinknots.org/#about) — upstream project's description of how Knots differs from Bitcoin Core.
- [BIP-110 (RDTS) and what it means for your node](https://start9.com/bip110/) — Start9's guidance on the chain this version follows, written after the August 2026 split.

## What you get on StartOS

- A full Bitcoin Knots node with three interfaces: **RPC Interface** (JSON-RPC for wallets and dependent services), **Peer Interface** (the network port other nodes connect to), and **ZeroMQ Interface** (block/transaction notifications, when ZMQ is enabled).
- An embedded **i2pd** sidecar that brings up I2P transport automatically — your node accepts inbound peers over I2P out of the box, with a separate **I2P Daemon Console** interface available when you turn the i2pd web console on.
- An automatic Tor outbound proxy (your node reaches `.onion` peers without configuration); add a `.onion` to the Peer Interface to advertise yourself and accept inbound Tor connections too.
- Disk-aware defaults: on disks smaller than 900 GB the package enables pruning and disables `txindex`; on larger disks you get a full archival node. The transition is transparent — pruned nodes route RPC through a small `btc-rpc-proxy` sidecar so port 8332 always serves RPC the same way, and it fetches any block your node has pruned from the peer-to-peer network on demand, so wallets and services see a node that behaves as though nothing were pruned.
- Shared `bitcoind` package id with Bitcoin Core — you can switch flavors without re-syncing the chain. Since the RDTS split, the switch also settles which of the two chains your node follows (see [Switching flavors during a chain split](#switching-flavors-during-a-chain-split)).

## Getting set up

Bitcoin Knots starts and begins Initial Block Download (IBD) immediately on install. A single critical task asks you to confirm that you are opting into the RDTS chain — a different blockchain and network from the one Bitcoin Core and Bitcoin Knots (pre-RDTS) follow; resolve it from the Dashboard.

1. Start the service. Open the Dashboard and watch the sync progress.
2. Resolve the **RDTS Chain Opt-In** critical task. It sets out what you are agreeing to: BIP-110 did not carry the network, so this version follows a chain of its own that currently produces a block only about once every day or two, a hard fork to a new proof-of-work algorithm is planned for 1 September 2026 to restore normal block production, and the two chains share no replay protection. To stay on the chain the rest of the network follows, install **Bitcoin Core** or the **Bitcoin Knots (pre-RDTS)** flavor from the marketplace instead.
3. If you want inbound clearnet peers, add a public IP or hostname on the **Peer Interface**. If you want inbound Tor peers, add a `.onion` there.
4. If you want to expose RPC to a wallet or dependent service that doesn't use the cookie file, run **Generate RPC User Credentials** and supply the username/password to the consumer.

> Initial Block Download takes hours to days depending on hardware and network. The node is functional immediately but RPC calls that depend on chain state will return partial results until sync completes.

## Using Bitcoin Knots

### RPC

The **RPC Interface** is where wallets, indexers, Lightning nodes, and other dependent services connect. Internal services on this StartOS authenticate via the cookie file automatically; external clients need an RPC user (see actions below).

### Configuration

Four configuration actions cover the full set of editable `bitcoin.conf` values, grouped to be navigable:

- **Mempool Settings** — Knots' policy controls (OP_RETURN limits, parasite/token filters, replacement rules, ancestor/descendant limits, dust relay fee, etc.) plus standard mempool sizing.
- **Peer Settings** — `onlynet`, BIP324 v2 transport, I2P SAM proxy on/off, manual peers, max connections.
- **RPC Settings** — RPC threads, work queue, server timeout.
- **Other Settings** — ZMQ, txindex, block templates, coinstats index, block filters (BIP158/157), pruning, dbcache, wallet master switches, NAT-PMP, max upload target, and more.

### RPC users

- **Generate RPC User Credentials** — create a username/password pair for an external client.
- **Delete RPC Users** — remove credentials you no longer need.

### Wallet (on-node wallets)

When wallets are not disabled, the node ships with a basic wallet toolkit you can drive from actions:

- **Select Wallet** — choose which wallet the other Wallet actions operate on. It defaults to `coin`, and the dropdown also lists wallets created by dependent services such as BTCPay Server/NBXplorer (including bitcoind's unnamed default wallet).
- **Get Address**, **Get Balance**, **Send Coin**, **Send All Coin**, **Sign Message**.
- **Backup Wallet** / **Restore Wallet** / **Remove Wallet**.

Every action above acts on the currently selected wallet, so if you run more than one wallet (for example alongside BTCPay Server) use **Select Wallet** to point them at the right one first — otherwise they operate on `coin`. For day-to-day use prefer a dedicated wallet pointed at the RPC interface; the action surface here is mainly for one-off recovery and maintenance.

### Mining

- **Prioritize Transaction** — bump a transaction's relative priority in the mempool with a fee delta.

### Maintenance

- **Reindex Blockchain** — full reindex; expect a long re-sync.
- **Reindex Chainstate** — rebuild chainstate from existing blocks (not available on pruned nodes).
- **Delete Peer List** — wipe `peers.dat` if peer discovery is misbehaving.
- **Delete Transaction Index** / **Delete Coinstats Index** — clear a corrupted index so it can be rebuilt.

### Switching flavors during a chain split

Bitcoin Core, Bitcoin Knots, and Bitcoin Knots (pre-RDTS) share your blockchain data, so switching between them keeps the chain you have already synced. They do not all agree on which blocks are valid, though, and your node remembers the verdicts it recorded under the flavor you left. The network has split over the RDTS upgrade, so that memory would leave you following the wrong side — it is corrected for you at the first start after a switch, and your node may reorganize onto a different chain as a result.

Switching **away** from this version clears the verdicts it recorded under RDTS; you get a **Chain Verdicts Reset** notification if anything was cleared. Switching **to** it re-checks your recent chain against the RDTS rules, which can take anywhere from minutes to many hours — watch the **Blockchain Sync** health check.

Three things to watch for during an actual split:

- **You need peers on the side you want.** Correcting the verdicts lets your node accept that chain; downloading it needs peers who serve it. If your node does not converge, add a trusted node under **Peer Settings → Add Nodes**.
- **A pruned node may not be able to switch sides.** Reorganizing needs old blocks a pruned node has already discarded. When they are gone you get a **Some Chains Not Recoverable** notification — run **Reindex Blockchain**, which on a pruned node re-downloads the whole chain. A pruned node also cannot reorganize further back than its retained window (at least the most recent 288 blocks), so a split older than roughly two days may leave that full re-download as the only way across.
- **Check your dependent services afterward.** A reorg during a split can be deep, and Lightning (LND, Core Lightning) is not safe against arbitrarily deep reorgs: one past a channel's funding depth can force-close channels.

### Advanced

- **Download UTXO Snapshot (assumeutxo)** — pull a UTXO snapshot to short-cut IBD; the action hides itself once the node is fully synced. The URL must be a direct link to a `.dat` snapshot file, which can be one you serve from your own machine over the LAN.
- **Runtime Information** — current connection count, block height, sync progress, softfork state, and other runtime details at a glance.

## Limitations

- **Wallet actions cover hot-wallet basics only.** Anything beyond the listed actions (coin control, PSBTs, multisig, hardware-wallet flows) needs an external wallet talking to the RPC interface.
- **Advanced i2pd tuning is not exposed.** Bandwidth class, transit share, floodfill, console, and tunnel limits are baked into the bundled `i2pd.conf`. To change them, edit `i2pd.conf` on the `i2pd` volume directly.
