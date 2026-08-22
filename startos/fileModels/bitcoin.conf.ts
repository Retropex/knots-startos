import { FileHelper, T, utils, z } from '@start9labs/start-sdk'
import * as diskusage from 'diskusage'
import { totalmem } from 'os'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  i2PSamAddress,
  peerPortInternal,
  peerPortLocal,
  rpcallowip,
  rpcallowipPruned,
  rpcbind,
  rpcbindPruned,
  rpccookiefile,
  zmqBundle,
} from '../utils'

// INI coercion helpers: INI parsing returns strings, with duplicate keys producing arrays.
// Each uses .catch(undefined) to match the old optional(t) = t.optional().onMismatch(undefined)

const iniString = z
  .union([z.array(z.string()).transform((a) => a.at(-1)!), z.string()])
  .optional()
  .catch(undefined)

const iniStringArray = z
  .union([z.array(z.string()), z.string().transform((s) => [s])])
  .optional()
  .catch(undefined)

const iniNumber = z
  .union([
    z.array(z.string()).transform((a) => Number(a.at(-1))),
    z.string().transform(Number),
    z.number(),
  ])
  .pipe(z.number())
  .optional()
  .catch(undefined)

const iniBoolean = z
  .union([
    z.string().transform((s) => !!Number(s)),
    z.number().transform((n) => !!n),
    z.boolean(),
  ])
  .optional()
  .catch(undefined)

export const minPrune = 550
export const minConnections = 40

const validNets = ['ipv4', 'ipv6', 'onion', 'i2p'] as const
const onlyNetOption = z.enum(validNets)
type ValidNets = z.infer<typeof onlyNetOption>

export const shape = z
  .object({
    // RPC enforced
    rpcbind: z.enum([rpcbind, rpcbindPruned]).catch(rpcbind),
    rpcallowip: z.enum([rpcallowip, rpcallowipPruned]).catch(rpcallowip),
    rpcuser: z.undefined().optional().catch(undefined),
    rpcpassword: z.undefined().optional().catch(undefined),
    rpccookiefile: z.literal('/root/.bitcoin/.cookie').catch('/root/.bitcoin/.cookie'),
    // Peers enforced
    listen: z.literal(true).catch(true),
    bind: z
      .union([z.array(z.string()).transform((a) => a.at(-1)!), z.string()])
      .catch(`0.0.0.0:${peerPortInternal}`),
    whitebind: z
      .literal(`0.0.0.0:${peerPortLocal}`)
      .catch(`0.0.0.0:${peerPortLocal}`),

    // RPC
    rpcauth: iniStringArray,
    rpcservertimeout: iniNumber,
    rpcthreads: iniNumber,
    rpcworkqueue: iniNumber,
    deprecatedrpc: z.literal('create_bdb').catch('create_bdb'),

    // Mempool
    persistmempool: iniBoolean,
    maxmempool: iniNumber,
    mempoolexpiry: iniNumber,
    mempoolfullrbf: iniBoolean,
    datacarrier: iniBoolean,
    datacarriersize: iniNumber,
    permitbaremultisig: iniBoolean,
    rejectparasites: iniBoolean,
    rejecttokens: iniBoolean,
    minrelaytxfee: iniNumber,
    bytespersigop: iniNumber,
    bytespersigopstrict: iniNumber,
    limitancestorcount: iniNumber,
    limitancestorsize: iniNumber,
    limitdescendantcount: iniNumber,
    limitdescendantsize: iniNumber,
    permitbarepubkey: iniBoolean,
    maxscriptsize: iniNumber,
    datacarriercost: iniNumber,
    acceptnonstddatacarrier: iniBoolean,
    dustrelayfee: iniNumber,
    permitephemeral: iniString,
    permitbareanchor: iniBoolean,
    permitbaredatacarrier: iniBoolean,
    maxtxlegacysigops: iniNumber,
    acceptunknownwitness: iniBoolean,
    minrelaycoinblocks: iniNumber,
    minrelaymaturity: iniNumber,
    mempoolreplacement: z
      .enum(['0', 'fee,optin', 'fee,-optin'])
      .optional()
      .catch(undefined),
    mempooltruc: z
      .enum(['reject', 'accept', 'enforce'])
      .optional()
      .catch(undefined),

    // Peers
    onlynet: z
      .union([onlyNetOption, z.array(onlyNetOption)])
      .optional()
      .catch(undefined),
    externalip: iniStringArray,
    whitelist: iniStringArray,
    v2transport: iniBoolean,
    connect: iniStringArray,
    addnode: iniStringArray,
    maxconnections: z
      .union([
        z.array(z.string()).transform((a) => Number(a.at(-1))),
        z.string().transform(Number),
        z.number(),
      ])
      .pipe(z.number())
      .transform((v) => (v < minConnections ? minConnections : v))
      .optional()
      .catch(undefined),
    blocksonly: iniBoolean,
    i2psam: z.literal(i2PSamAddress).optional().catch(undefined),
    i2pacceptincoming: iniBoolean,

    // Wallet
    disablewallet: iniBoolean,
    avoidpartialspends: iniBoolean,
    discardfee: iniNumber,

    // ZMQ
    zmqpubrawblock: iniString,
    zmqpubhashblock: iniString,
    zmqpubrawtx: iniString,
    zmqpubhashtx: iniString,
    zmqpubsequence: iniString,

    // Performance Tuning
    dbcache: iniNumber,
    dbbatchsize: iniNumber,

    // Block Template & Reconstruction
    blockmaxsize: iniNumber,
    blockmaxweight: iniNumber,
    blockreconstructionextratxn: iniNumber,
    blockreconstructionextratxnsize: iniNumber,

    // Other
    softwareexpiry: iniNumber,
    blake2b_headline: iniString,
    blocknotify: iniString,
    prune: z
      .union([
        z.array(z.string()).transform((a) => Number(a.at(-1))),
        z.string().transform(Number),
        z.number(),
      ])
      .pipe(z.number())
      .transform((v) => (v > 0 && v < minPrune ? minPrune : v))
      .catch(0),
    coinstatsindex: iniBoolean,
    txindex: iniBoolean,
    peerbloomfilters: iniBoolean,
    blockfilterindex: z
      .union([
        z.literal('basic'),
        z.union([
          z.string().transform((s) => !!Number(s)),
          z.number().transform((n) => !!n),
          z.boolean(),
        ]),
      ])
      .optional()
      .catch(undefined),
    peerblockfilters: iniBoolean,
    natpmp: iniBoolean,
    maxuploadtarget: iniNumber,
  })
  .loose()

function stringifyPrimitives(a: unknown): any {
  if (a && typeof a === 'object') {
    if (Array.isArray(a)) {
      return a.map(stringifyPrimitives)
    }
    return Object.fromEntries(
      Object.entries(a).map(([k, v]) => [k, stringifyPrimitives(v)]),
    )
  } else if (typeof a === 'boolean') {
    return a ? 1 : 0
  }
  return a
}

const { InputSpec, Value, Variants, List } = sdk

export const diskUsage = utils.once(() => diskusage.check('/'))
export const archivalMin = 900_000_000_000

// Override defaults (diverging from upstream Bitcoin Knots)
export const defaultDatacarriercost = 1

export const defaultDbcache = () =>
  Math.min(Math.floor((totalmem() * 0.25) / (1024 * 1024)), 5_120)

export const defaultDbbatchsize = () =>
  Math.min(Math.max(Math.floor(totalmem() / 256), 16_777_216), 33_554_432)

export const fullConfigSpec = sdk.InputSpec.of({
  raw: Value.hidden(shape),

  // === MEMPOOL ===
  persistmempool: Value.triState({
    name: i18n('Persist Mempool'),
    description: i18n('Save the mempool on shutdown and load on restart.'),
    default: null,
    footnote: `${i18n('Default')}: true`,
  }),
  maxmempool: Value.number({
    name: i18n('Max Mempool Size'),
    description: i18n('Keep the transaction memory pool below <n> megabytes.'),
    required: false,
    default: null,
    min: 1,
    integer: true,
    units: 'MiB',
    footnote: `${i18n('Default')}: 300 MiB`,
  }),
  mempoolexpiry: Value.number({
    name: i18n('Mempool Expiration'),
    description: i18n(
      'Do not keep transactions in the mempool longer than <n> hours.',
    ),
    required: false,
    default: null,
    min: 1,
    integer: true,
    units: i18n('Hr'),
    footnote: `${i18n('Default')}: 336 Hr`,
  }),
  mempoolfullrbf: Value.triState({
    name: i18n('Enable Full RBF'),
    description: i18n(
      'Policy for your node to use for relaying and mining unconfirmed transactions.',
    ),
    default: null,
    footnote: `${i18n('Default')}: true`,
  }),
  permitbaremultisig: Value.triState({
    name: i18n('Permit Bare Multisig'),
    description: i18n('Relay non-P2SH multisig transactions'),
    default: null,
    footnote: `${i18n('Default')}: false`,
  }),
  datacarrier: Value.triState({
    name: i18n('Relay OP_RETURN Transactions'),
    description: i18n('Relay transactions with OP_RETURN outputs'),
    default: null,
    footnote: `${i18n('Default')}: true`,
  }),
  datacarriersize: Value.number({
    name: i18n('Max OP_RETURN Size'),
    description: i18n('Maximum size of data in OP_RETURN outputs to relay'),
    required: false,
    default: null,
    min: 0,
    max: 10_000,
    integer: true,
    units: i18n('bytes'),
    footnote: `${i18n('Default')}: 83 bytes`,
  }),
  permitbaredatacarrier: Value.triState({
    name: i18n('Permit Bare Datacarrier'),
    description: i18n('Relay transactions that only have data carrier outputs'),
    default: null,
    footnote: `${i18n('Default')}: false`,
  }),
  rejectparasites: Value.triState({
    name: i18n('Reject Parasites'),
    description: i18n('Reject parasite transactions'),
    default: null,
    footnote: `${i18n('Default')}: true`,
  }),
  rejecttokens: Value.triState({
    name: i18n('Reject Tokens'),
    description: i18n('Reject tokens transactions (runes)'),
    default: null,
    footnote: `${i18n('Default')}: false`,
  }),
  mempoolreplacement: Value.select({
    name: i18n('Mempool Replacement'),
    description: i18n(
      'Set to disabled to disable RBF entirely, "fee,optin" to honour RBF opt-out signal, or "fee,-optin" to always RBF aka full RBF',
    ),
    default: 'default',
    values: {
      default: i18n('Default'),
      '0': i18n('Disabled'),
      'fee,optin': 'fee,optin',
      'fee,-optin': 'fee,-optin',
    },
    footnote: `${i18n('Default')}: fee,-optin`,
  } as const),
  mempooltruc: Value.select({
    name: i18n('Mempool TRUC'),
    description: i18n(
      'Behaviour for transactions requesting TRUC limits: "reject" the transactions entirely, "accept" them just like any other, or "enforce" to impose their requested restrictions',
    ),
    default: 'default',
    values: {
      default: i18n('Default'),
      reject: i18n('Reject'),
      accept: i18n('Accept'),
      enforce: i18n('Enforce'),
    },
    footnote: `${i18n('Default')}: accept`,
  } as const),
  permitbareanchor: Value.triState({
    name: i18n('Permit Bare Anchor'),
    description: i18n(
      'Relay transactions that only have ephemeral anchor outputs',
    ),
    default: null,
    footnote: `${i18n('Default')}: true`,
  }),
  permitephemeral: Value.text({
    name: i18n('Permit Ephemeral'),
    description: i18n(
      'Relay transaction packages that include ephemeral outputs defined by comma-separated options (prefix each by \'-\' to force off): "anchor" to allow minimal anyone-can-spend anchors, "send" to allow ordinary output types to be considered ephemeral, and "dust" to allow for dust-amount outputs rather than strictly zero-value',
    ),
    required: false,
    default: null,
  }),
  minrelaytxfee: Value.number({
    name: i18n('Min Transaction Relay Fee'),
    description: i18n(
      'Fee rates (in BTC/kB) smaller than this are considered zero fee for relaying, mining and transaction creation',
    ),
    default: null,
    required: false,
    min: 0,
    integer: false,
    units: 'BTC/kvB',
    footnote: `${i18n('Default')}: 0.00001 BTC/kvB`,
  }),
  bytespersigop: Value.number({
    name: i18n('Bytes Per Sigop'),
    description: i18n(
      'Equivalent bytes per sigop in transactions for relay and mining',
    ),
    default: null,
    required: false,
    min: 0,
    max: 20,
    integer: true,
    units: i18n('bytes'),
    footnote: `${i18n('Default')}: 20 bytes`,
  }),
  bytespersigopstrict: Value.number({
    name: i18n('Bytes Per Sigop Strict'),
    description: i18n(
      'Minimum bytes per sigop in transactions we relay and mine',
    ),
    default: null,
    required: false,
    min: 0,
    integer: true,
    units: i18n('bytes'),
    footnote: `${i18n('Default')}: 20 bytes`,
  }),
  maxtxlegacysigops: Value.number({
    name: i18n('Max Legacy Sigops'),
    description: i18n(
      'Maximum number of legacy sigops allowed in transactions we relay and mine, as measured by BIP54',
    ),
    default: null,
    required: false,
    min: 0,
    integer: true,
    footnote: `${i18n('Default')}: 2500`,
  }),
  limitancestorcount: Value.number({
    name: i18n('Max Ancestor Count'),
    description: i18n(
      'Do not accept transactions if number of in-mempool ancestors is <n> or more',
    ),
    default: null,
    required: false,
    min: 0,
    integer: true,
    footnote: `${i18n('Default')}: 25`,
  }),
  limitancestorsize: Value.number({
    name: i18n('Max Ancestor Size'),
    description: i18n(
      'Do not accept transactions whose size with all in-mempool ancestors exceeds <n> kilobytes',
    ),
    default: null,
    required: false,
    min: 0,
    integer: true,
    units: 'kB',
    footnote: `${i18n('Default')}: 101 kB`,
  }),
  limitdescendantcount: Value.number({
    name: i18n('Max Descendant Count'),
    description: i18n(
      'Do not accept transactions if any ancestor would have <n> or more in-mempool descendants',
    ),
    default: null,
    required: false,
    min: 0,
    integer: true,
    footnote: `${i18n('Default')}: 25`,
  }),
  limitdescendantsize: Value.number({
    name: i18n('Max Descendant Size'),
    description: i18n(
      'Do not accept transactions if any ancestor would have more than <n> kilobytes of in-mempool descendants',
    ),
    default: null,
    required: false,
    min: 0,
    integer: true,
    units: 'kB',
    footnote: `${i18n('Default')}: 101 kB`,
  }),
  permitbarepubkey: Value.triState({
    name: i18n('Permit Bare Pubkey'),
    description: i18n('Relay legacy pubkey outputs'),
    default: null,
    footnote: `${i18n('Default')}: false`,
  }),
  maxscriptsize: Value.number({
    name: i18n('Max Script Size'),
    description: i18n('Maximum size of scripts we relay and mine, in bytes'),
    default: null,
    required: false,
    min: 0,
    integer: true,
    units: i18n('Bytes'),
    footnote: `${i18n('Default')}: 1650 Bytes`,
  }),
  datacarriercost: Value.number({
    name: i18n('Datacarrier Cost'),
    description: i18n(
      'Treat extra data in transactions as at least N vbytes per actual byte',
    ),
    default: defaultDatacarriercost,
    required: true,
    min: 0,
    integer: true,
    footnote: `${i18n('Default')}: 4`,
  }),
  acceptnonstddatacarrier: Value.triState({
    name: i18n('Accept Non-Standard Datacarrier'),
    description: i18n('Relay and mine non-OP_RETURN datacarrier injection'),
    default: null,
    footnote: `${i18n('Default')}: false`,
  }),
  dustrelayfee: Value.number({
    name: i18n('Dust Relay Fee'),
    description: i18n(
      'Fee rate (in BTC/kvB) used to define dust, the value of an output such that it will cost more than its value in fees at this fee rate to spend it.',
    ),
    default: null,
    required: false,
    min: 0,
    integer: false,
    units: 'BTC/kvB',
    footnote: `${i18n('Default')}: 0.00003 BTC/kvB`,
  }),
  acceptunknownwitness: Value.triState({
    name: i18n('Accept Unknown Witness'),
    description: i18n(
      'Relay transactions sending to unknown witness script versions',
    ),
    default: null,
    footnote: `${i18n('Default')}: true`,
  }),
  minrelaycoinblocks: Value.number({
    name: i18n('Min Relay Coin Blocks'),
    description: i18n(
      'Minimum coin blocks (measured in sat per block) that a transaction must be spending to be relayed',
    ),
    default: null,
    required: false,
    min: 0,
    integer: true,
  }),
  minrelaymaturity: Value.number({
    name: i18n('Min Relay Maturity'),
    description: i18n(
      'Minimum number of blocks that inputs must mature before being spent in transactions we relay',
    ),
    default: null,
    required: false,
    min: 0,
    integer: true,
    units: i18n('Blocks'),
  }),

  // === OTHER ===
  softwareexpiry: Value.number({
    name: i18n('Software Expiry'),
    description: i18n(
      'Stop working after this POSIX timestamp (set to 0 to disable)',
    ),
    default: 1825593420,
    required: true,
    integer: true,
    units: i18n('timestamp'),
  }),
  blake2b_headline: Value.text({
    name: 'BLAKE2b headline',
    description: 'Specify consensus-critical proof-of-time news headline',
    required: true,
    default: null,
    warning: 'MUST BE SET TO EXACT CORRECT STRING',
  }),
  zmqEnabled: Value.triState({
    name: i18n('ZeroMQ Enabled'),
    description: i18n(
      'The ZeroMQ interface is useful for some applications which might require data related to block and transaction events from Bitcoin Knots. For example, LND requires ZeroMQ be enabled for LND to get the latest block data',
    ),
    default: true,
    footnote: `${i18n('Default')}: false`,
  }),
  txindex: Value.dynamicTriState(async ({ effects }) => {
    const disk = await diskUsage()
    return {
      name: i18n('Transaction Index'),
      default: null,
      description: i18n(
        'By enabling Transaction Index (txindex) Bitcoin Knots will build a complete transaction index. This allows Bitcoin Knots to access any transaction with commands like `getrawtransaction`.',
      ),
      footnote: `${i18n('Default')}: false`,
      disabled:
        disk.total < archivalMin ? i18n('Not enough disk space') : false,
    }
  }),
  blocknotify: Value.text({
    name: i18n('Block Notify'),
    required: false,
    default: null,
    description: i18n(
      'Execute an arbitrary command when the best block changes',
    ),
  }),
  templateconstruction: Value.object(
    {
      name: i18n('Template Construction'),
      description: i18n('Set limits for block size/weight'),
    },
    InputSpec.of({
      blockmaxsize: Value.number({
        name: i18n('Max Block Size'),
        description: i18n('Maximum block size in bytes'),
        default: null,
        required: false,
        min: 100_000,
        max: 3_985_000,
        integer: true,
        units: i18n('Bytes'),
        footnote: `${i18n('Default')}: 100,000 Bytes`,
      }),
      blockmaxweight: Value.number({
        name: i18n('Max Block Weight'),
        description: i18n('Maximum block weight in vBytes'),
        default: null,
        required: false,
        min: 100_000,
        max: 3_985_000,
        integer: true,
        units: i18n('vBytes'),
        footnote: `${i18n('Default')}: 100,000 vBytes`,
      }),
    }),
  ),
  blockreconstruction: Value.object(
    {
      name: i18n('Compact Block Reconstructions'),
      description: i18n('Settings for compact block reconstructions'),
    },
    InputSpec.of({
      blockreconstructionextratxn: Value.number({
        name: i18n('Block Reconstruction Extra TXN'),
        description: i18n(
          'Extra transactions to keep in memory for compact block reconstructions',
        ),
        default: null,
        required: false,
        min: 0,
        integer: true,
        footnote: `${i18n('Default')}: 32768`,
      }),
      blockreconstructionextratxnsize: Value.number({
        name: i18n('Block Reconstruction Extra TXN Size'),
        description: i18n(
          'Upper limit of memory usage (in megabytes) for keeping extra transactions in memory for compact block reconstructions',
        ),
        default: null,
        required: false,
        min: 0,
        integer: true,
        units: 'MB',
        footnote: `${i18n('Default')}: 10 MB`,
      }),
    }),
  ),
  coinstatsindex: Value.triState({
    name: i18n('Coinstats Index'),
    description: i18n(
      'Enabling Coinstats Index reduces the time for the gettxoutsetinfo RPC to complete at the cost of using additional disk space',
    ),
    default: null,
    footnote: `${i18n('Default')}: false`,
  }),
  wallet: Value.object(
    { name: i18n('Wallet'), description: i18n('Wallet Settings') },
    InputSpec.of({
      enable: Value.triState({
        name: i18n('Enable Wallet'),
        description: i18n('Load the wallet and enable wallet RPC calls.'),
        default: null,
        footnote: `${i18n('Default')}: true`,
      }),
      avoidpartialspends: Value.triState({
        name: i18n('Avoid Partial Spends'),
        description: i18n(
          'Group outputs by address, selecting all or none, instead of selecting on a per-output basis. This improves privacy at the expense of higher transaction fees.',
        ),
        default: null,
        footnote: `${i18n('Default')}: false`,
      }),
      discardfee: Value.number({
        name: i18n('Discard Change Tolerance'),
        description: i18n(
          'The fee rate (in BTC/kB) that indicates your tolerance for discarding change by adding it to the fee.',
        ),
        required: false,
        default: null,
        min: 0,
        max: 0.01,
        integer: false,
        units: i18n('BTC/kB'),
        footnote: `${i18n('Default')}: 0.0001 BTC/kB`,
      }),
    }),
  ),
  prune: Value.dynamicNumber(async ({ effects }) => {
    const disk = await diskUsage()
    const smallDisk = disk.total < archivalMin

    return {
      name: i18n('Pruning'),
      description: i18n(
        'Set the maximum size of the blockchain you wish to store on disk. Set to 0 to store the entire blockchain (full archival).',
      ),
      warning: i18n(
        'If your node is already pruned increasing this value will require re-syncing your node. Switching from a full archival node to pruned will disable txindex (if enabled)',
      ),
      placeholder: null,
      required: false,
      default: smallDisk ? minPrune : 0,
      integer: true,
      units: 'MiB',
      min: smallDisk ? minPrune : 0,
      max: Math.floor((disk.total * 0.75) / (1024 * 1024)),
    }
  }),
  dbcache: Value.number({
    name: i18n('Database Cache'),
    description: i18n(
      'How much RAM to allocate for caching the TXO set. Higher values improve syncing performance, but may result in some re-work in the event of an ungraceful shutdown. 4-7GB is high enough to get most of the peformance benefit during IBD. Consider reducing this setting for lower resource devices (or a device with less available RAM)',
    ),
    required: false,
    default: null,
    min: 0,
    integer: true,
    units: 'MiB',
    footnote: `${i18n('Default')}: 450 MiB`,
  }),
  dbbatchsize: Value.number({
    name: i18n('Database Batch'),
    description: i18n(
      'Maximum database write batch size in bytes. Higher values will speed up the critical sections when the utxo set is written to disk from memory in big batches.',
    ),
    required: false,
    default: null,
    min: 0,
    integer: true,
    units: i18n('Bytes'),
    footnote: `${i18n('Default')}: 67108864 Bytes`,
  }),
  blockfilters: Value.object(
    {
      name: i18n('Block Filters'),
      description: i18n(
        'Settings for storing and serving compact block filters',
      ),
    },
    InputSpec.of({
      blockfilterindex: Value.triState({
        name: i18n('Compute Compact Block Filters (BIP158)'),
        description: i18n(
          "Generate Compact Block Filters during initial sync (IBD) to enable 'getblockfilter' RPC. This is useful if dependent services need block filters to efficiently scan for addresses/transactions etc.",
        ),
        default: true,
        footnote: `${i18n('Default')}: false`,
      }),
      peerblockfilters: Value.triState({
        name: i18n('Serve Compact Block Filters to Peers (BIP157)'),
        description: i18n(
          "Serve Compact Block Filters as a peer service to other nodes on the network. This is useful if you wish to connect an SPV client to your node to make it efficient to scan transactions without having to download all block data.  'Compute Compact Block Filters (BIP158)' is required.",
        ),
        default: null,
        footnote: `${i18n('Default')}: false`,
      }),
    }),
  ),
  peerbloomfilters: Value.triState({
    name: i18n('Serve Bloom Filters to Peers'),
    description: i18n(
      'Peers have the option of setting filters on each connection they make after the version handshake has completed. Bloom filters are for clients implementing SPV (Simplified Payment Verification) that want to check that block headers  connect together correctly, without needing to verify the full blockchain.  The client must trust that the transactions in the chain are in fact valid.  It is highly recommended AGAINST using for anything except Bisq integration.',
    ),
    warning: i18n(
      'This is ONLY for use with Bisq integration, please use Block Filters for all other applications.',
    ),
    default: null,
    footnote: `${i18n('Default')}: false`,
  }),
  natpmp: Value.triState({
    name: i18n('NAT-PMP'),
    description: i18n('Use PCP or NAT-PMP to map the listening port.'),
    default: false,
    footnote: `${i18n('Default')}: true`,
  }),
  maxuploadtarget: Value.number({
    name: i18n('Max Upload Target'),
    description: i18n(
      "Tries to keep outbound traffic under the given target in MiB per 24h. Limit does not apply to peers with 'download' permission or blocks created within past week. 0 = no limit.",
    ),
    required: false,
    default: null,
    min: 0,
    integer: true,
    units: 'MiB',
    footnote: `${i18n('Default')}: 0 MiB`,
  }),

  // === PEERS ===
  onlynet: Value.multiselect({
    name: i18n('Onlynet'),
    description: i18n(
      'Make automatic outbound connections only to the selected networks. Inbound and manual connections are not affected by this option.',
    ),
    values: Object.fromEntries(
      validNets.map((n) => [n, n === 'onion' ? 'onion (Tor)' : n]),
    ) as Record<ValidNets, string>,
    default: [],
  }),
  v2transport: Value.triState({
    name: i18n('Use V2 P2P Transport Protocol'),
    description: i18n(
      'Enable or disable the use of BIP324 V2 P2P transport protocol.',
    ),
    default: null,
    footnote: `${i18n('Default')}: true`,
  }),
  connectpeer: Value.union({
    name: i18n('Connect Peer'),
    default: 'addnode',
    variants: Variants.of({
      connect: {
        name: i18n('Connect'),
        spec: InputSpec.of({
          peers: Value.list(
            List.text(
              {
                name: i18n('Connect Nodes'),
                minLength: 1,
                description: i18n(
                  'Add addresses of nodes for Bitcoin to EXCLUSIVELY connect to.',
                ),
              },
              {
                patterns: [
                  {
                    regex:
                      '(^s*((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?:[0-9]{1,5}))s*$)|(^s*((?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*.?:[0-9]{1,5})s*$)|(^s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:)))(%.+)?:[0-9]{1,5}s*$)',
                    description: i18n(
                      "Must be either a domain name, or an IPv4 or IPv6 address. Be sure to include the port number, but do not include protocol scheme (eg 'http://').",
                    ),
                  },
                ],
              },
            ),
          ),
        }),
      },
      addnode: {
        name: i18n('Add Node'),
        spec: InputSpec.of({
          peers: Value.list(
            List.text(
              {
                name: i18n('Add Nodes'),
                description: i18n(
                  'Add addresses of nodes for Bitcoin to connect with in addition to default nodes.',
                ),
              },
              {
                inputmode: 'text',
                patterns: [
                  {
                    regex:
                      '(^s*((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?:[0-9]{1,5}))s*$)|(^s*((?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*.?:[0-9]{1,5})s*$)|(^s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:)))(%.+)?:[0-9]{1,5}s*$)',
                    description: i18n(
                      "Must be either a domain name, or an IPv4 or IPv6 address. Be sure to include the port number, but do not include protocol scheme (eg 'http://').",
                    ),
                  },
                ],
              },
            ),
          ),
        }),
      },
    }),
  }),
  maxconnections: Value.number({
    name: i18n('Maximum Connections'),
    description: i18n(
      'Set the maximum number of connections to maintain with peers. Bitcoin reserves 11 of these for its own outbound peers; the rest are inbound slots, shared between peers on the internet and services on this server that fetch blocks over P2P, such as Electrs. The minimum keeps enough of them free that one of those services can still claim a slot when the rest are taken. To reduce bandwidth, prefer Max Upload Target (Other Settings), whose limit does not apply to those services, or Blocks Only (Mempool Settings).',
    ),
    default: null,
    required: false,
    min: minConnections,
    integer: true,
    footnote: `${i18n('Default')}: 125`,
  }),
  blocksonly: Value.triState({
    name: i18n('Blocks Only'),
    description: i18n(
      'Reduce bandwidth by not relaying transactions. Blocks will still be downloaded and validated normally. Disables the mempool, wallet transaction broadcasting, and fee estimation.',
    ),
    default: null,
    footnote: `${i18n('Default')}: false`,
  }),

  // === RPC ===
  rpcservertimeout: Value.number({
    name: i18n('Rpc Server Timeout'),
    description: i18n(
      'Number of seconds after which an uncompleted RPC call will time out.',
    ),
    required: false,
    default: null,
    min: 5,
    max: 300,
    integer: true,
    units: i18n('seconds'),
    footnote: `${i18n('Default')}: 30 seconds`,
  }),
  rpcthreads: Value.number({
    name: i18n('Threads'),
    description: i18n(
      'Set the number of threads for handling RPC calls. You may wish to increase this if you are making lots of calls via an integration.',
    ),
    required: false,
    default: null,
    min: 4,
    max: 64,
    step: null,
    integer: true,
    units: null,
    footnote: `${i18n('Default')}: 16`,
  }),
  rpcworkqueue: Value.number({
    name: i18n('Work Queue'),
    description: i18n(
      'Set the depth of the work queue to service RPC calls. Determines how long the backlog of RPC requests can get before it just rejects new ones.',
    ),
    required: false,
    default: null,
    min: 8,
    max: 256,
    step: null,
    integer: true,
    units: i18n('requests'),
    footnote: `${i18n('Default')}: 64 requests`,
  }),
})

function fileToForm(
  input: z.infer<typeof shape>,
): T.DeepPartial<typeof fullConfigSpec._TYPE> {
  const {
    // Mempool
    persistmempool,
    maxmempool,
    mempoolexpiry,
    mempoolfullrbf,
    permitbaremultisig,
    datacarrier,
    datacarriersize,
    permitbaredatacarrier,
    rejectparasites,
    rejecttokens,
    mempoolreplacement,
    mempooltruc,
    permitbareanchor,
    permitephemeral,
    minrelaytxfee,
    bytespersigop,
    bytespersigopstrict,
    maxtxlegacysigops,
    limitancestorcount,
    limitancestorsize,
    limitdescendantcount,
    limitdescendantsize,
    permitbarepubkey,
    maxscriptsize,
    datacarriercost,
    acceptnonstddatacarrier,
    dustrelayfee,
    acceptunknownwitness,
    minrelaycoinblocks,
    minrelaymaturity,
    // ZMQ
    zmqpubhashblock,
    zmqpubhashtx,
    zmqpubrawblock,
    zmqpubrawtx,
    zmqpubsequence,
    // Other
    softwareexpiry,
    blake2b_headline,
    txindex,
    coinstatsindex,
    disablewallet,
    avoidpartialspends,
    discardfee,
    blocknotify,
    prune,
    dbcache,
    dbbatchsize,
    blockfilterindex,
    peerblockfilters,
    peerbloomfilters,
    blockmaxsize,
    blockmaxweight,
    blockreconstructionextratxn,
    blockreconstructionextratxnsize,
    natpmp,
    maxuploadtarget,
    // Peers
    onlynet,
    v2transport,
    connect,
    addnode,
    maxconnections,
    blocksonly,
    // RPC
    rpcservertimeout,
    rpcthreads,
    rpcworkqueue,
  } = input

  return {
    raw: input ?? {},

    // Mempool - 1:1 pass-through
    persistmempool,
    maxmempool,
    mempoolexpiry,
    mempoolfullrbf,
    permitbaremultisig,
    datacarrier,
    datacarriersize,
    permitbaredatacarrier,
    rejectparasites,
    rejecttokens,
    mempoolreplacement: mempoolreplacement ?? 'default',
    mempooltruc: mempooltruc ?? 'default',
    permitbareanchor,
    permitephemeral,
    minrelaytxfee,
    bytespersigop,
    bytespersigopstrict,
    maxtxlegacysigops,
    limitancestorcount,
    limitancestorsize,
    limitdescendantcount,
    limitdescendantsize,
    permitbarepubkey,
    maxscriptsize,
    datacarriercost,
    acceptnonstddatacarrier,
    dustrelayfee,
    acceptunknownwitness,
    minrelaycoinblocks,
    minrelaymaturity,

    // Other - with transforms
    softwareexpiry,
    blake2b_headline,
    zmqEnabled: !!(
      zmqpubhashblock &&
      zmqpubhashtx &&
      zmqpubrawblock &&
      zmqpubrawtx &&
      zmqpubsequence
    ),
    txindex,
    coinstatsindex,
    wallet: {
      enable: !disablewallet,
      avoidpartialspends,
      discardfee,
    },
    blocknotify,
    templateconstruction: {
      blockmaxsize,
      blockmaxweight,
    },
    blockreconstruction: {
      blockreconstructionextratxn,
      blockreconstructionextratxnsize,
    },
    prune,
    dbcache: dbcache ?? null,
    dbbatchsize: dbbatchsize ?? null,
    blockfilters: {
      blockfilterindex: blockfilterindex === 'basic',
      peerblockfilters,
    },
    peerbloomfilters,
    natpmp,
    maxuploadtarget,

    // Peers
    onlynet: onlynet
      ? [onlynet]
          .flat()
          .filter(
            (x): x is ValidNets =>
              x !== undefined && (validNets as readonly string[]).includes(x),
          )
      : undefined,
    v2transport,
    connectpeer: {
      selection:
        connect !== undefined ? ('connect' as const) : ('addnode' as const),
      value: {
        peers:
          connect !== undefined
            ? [connect].flat().filter((x): x is string => x !== undefined)
            : [addnode].flat().filter((x): x is string => x !== undefined),
      },
    },
    maxconnections,
    blocksonly,

    // RPC
    rpcservertimeout,
    rpcthreads,
    rpcworkqueue,
  }
}

// @TODO: formToFile and fileToForm have no exhaustiveness check — if a new field
// is added to fullConfigSpec, TypeScript won't warn that it's missing here.
function formToFile(
  input: T.DeepPartial<typeof fullConfigSpec._TYPE>,
): z.infer<typeof shape> {
  const {
    raw,
    // Mempool
    persistmempool,
    maxmempool,
    mempoolexpiry,
    mempoolfullrbf,
    permitbaremultisig,
    datacarrier,
    datacarriersize,
    permitbaredatacarrier,
    rejectparasites,
    rejecttokens,
    mempoolreplacement,
    mempooltruc,
    permitbareanchor,
    permitephemeral,
    minrelaytxfee,
    bytespersigop,
    bytespersigopstrict,
    maxtxlegacysigops,
    limitancestorcount,
    limitancestorsize,
    limitdescendantcount,
    limitdescendantsize,
    permitbarepubkey,
    maxscriptsize,
    datacarriercost,
    acceptnonstddatacarrier,
    dustrelayfee,
    acceptunknownwitness,
    minrelaycoinblocks,
    minrelaymaturity,
    // Other
    softwareexpiry,
    blake2b_headline,
    prune,
    wallet,
    txindex,
    coinstatsindex,
    peerbloomfilters,
    blockfilters,
    blocknotify,
    dbcache,
    dbbatchsize,
    zmqEnabled,
    templateconstruction,
    blockreconstruction,
    natpmp,
    maxuploadtarget,
    // Peers
    v2transport,
    onlynet,
    connectpeer,
    maxconnections,
    blocksonly,
    // RPC
    rpcservertimeout,
    rpcthreads,
    rpcworkqueue,
  } = input

  return {
    ...raw,

    // Enforced fields
    rpccookiefile: '/root/.bitcoin/.cookie',
    listen: true,
    bind: `0.0.0.0:${peerPortInternal}`,
    whitebind: `0.0.0.0:${peerPortLocal}`,
    deprecatedrpc: 'create_bdb',
    rpcauth: raw?.rpcauth?.filter((a) => !!a) as string[] | undefined,
    whitelist: raw?.whitelist?.filter((a) => !!a) as string[] | undefined,
    externalip: raw?.externalip?.filter((a) => !!a) as string[] | undefined,

    // RPC (prune-derived)
    rpcbind: prune ? rpcbindPruned : rpcbind,
    rpcallowip: prune ? rpcallowipPruned : rpcallowip,

    // Mempool - 1:1 pass-through
    persistmempool: persistmempool ?? undefined,
    maxmempool: maxmempool ?? undefined,
    mempoolexpiry: mempoolexpiry ?? undefined,
    mempoolfullrbf: mempoolfullrbf ?? undefined,
    permitbaremultisig: permitbaremultisig ?? undefined,
    datacarrier: datacarrier ?? undefined,
    datacarriersize: datacarriersize ?? undefined,
    permitbaredatacarrier: permitbaredatacarrier ?? undefined,
    rejectparasites: rejectparasites ?? undefined,
    rejecttokens: rejecttokens ?? undefined,
    mempoolreplacement:
      mempoolreplacement === 'default' ? undefined : mempoolreplacement,
    mempooltruc: mempooltruc === 'default' ? undefined : mempooltruc,
    permitbareanchor: permitbareanchor ?? undefined,
    permitephemeral: permitephemeral || undefined,
    minrelaytxfee: minrelaytxfee ?? undefined,
    bytespersigop: bytespersigop ?? undefined,
    bytespersigopstrict: bytespersigopstrict ?? undefined,
    maxtxlegacysigops: maxtxlegacysigops ?? undefined,
    limitancestorcount: limitancestorcount ?? undefined,
    limitancestorsize: limitancestorsize ?? undefined,
    limitdescendantcount: limitdescendantcount ?? undefined,
    limitdescendantsize: limitdescendantsize ?? undefined,
    permitbarepubkey: permitbarepubkey ?? undefined,
    maxscriptsize: maxscriptsize ?? undefined,
    datacarriercost,
    acceptnonstddatacarrier: acceptnonstddatacarrier ?? undefined,
    dustrelayfee: dustrelayfee ?? undefined,
    acceptunknownwitness: acceptunknownwitness ?? undefined,
    minrelaycoinblocks: minrelaycoinblocks ?? undefined,
    minrelaymaturity: minrelaymaturity ?? undefined,

    // Wallet
    disablewallet: wallet?.enable == null ? undefined : !wallet.enable,
    avoidpartialspends: wallet?.avoidpartialspends ?? undefined,
    discardfee: wallet?.discardfee ?? undefined,

    // Other
    softwareexpiry,
    blake2b_headline,
    txindex: prune ? false : (txindex ?? undefined),
    coinstatsindex: coinstatsindex ?? undefined,
    peerbloomfilters: peerbloomfilters ?? undefined,
    peerblockfilters: blockfilters?.peerblockfilters ?? undefined,
    blockfilterindex:
      blockfilters?.blockfilterindex == null
        ? undefined
        : blockfilters.blockfilterindex
          ? 'basic'
          : false,
    blocknotify: blocknotify || undefined,
    prune: prune ?? 0,
    dbcache: dbcache ?? undefined,
    dbbatchsize: dbbatchsize ?? undefined,
    // ZMQ
    ...(zmqEnabled === true
      ? zmqBundle
      : zmqEnabled === false
        ? {
            zmqpubrawblock: undefined,
            zmqpubhashblock: undefined,
            zmqpubrawtx: undefined,
            zmqpubhashtx: undefined,
            zmqpubsequence: undefined,
          }
        : {}),

    // Block Template & Reconstruction
    blockmaxsize: templateconstruction?.blockmaxsize ?? undefined,
    blockmaxweight: templateconstruction?.blockmaxweight ?? undefined,
    blockreconstructionextratxn:
      blockreconstruction?.blockreconstructionextratxn ?? undefined,
    blockreconstructionextratxnsize:
      blockreconstruction?.blockreconstructionextratxnsize ?? undefined,
    natpmp: natpmp ?? undefined,
    maxuploadtarget: maxuploadtarget ?? undefined,

    // Peers
    v2transport: v2transport ?? undefined,
    onlynet: onlynet?.length ? input.onlynet?.filter((a) => !!a) : undefined,
    maxconnections: maxconnections ?? undefined,
    blocksonly: blocksonly ?? undefined,
    connect:
      connectpeer?.selection === 'connect'
        ? (connectpeer.value?.peers?.filter((a) => !!a) as string[] | undefined)
        : undefined,
    addnode:
      connectpeer?.selection === 'addnode'
        ? (connectpeer.value?.peers?.filter((a) => !!a) as string[] | undefined)
        : undefined,

    // RPC
    rpcservertimeout: rpcservertimeout ?? undefined,
    rpcthreads: rpcthreads ?? undefined,
    rpcworkqueue: rpcworkqueue ?? undefined,
  }
}

export const bitcoinConfFile = FileHelper.ini(
  {
    base: sdk.volumes.main,
    subpath: '/bitcoin.conf',
  },
  fullConfigSpec.partialValidator,
  { bracketedArray: false },
  {
    onRead: (a) => {
      const section = (a as any)?.testnet4 ?? a
      const base = shape.parse(section)
      return fileToForm(base)
    },
    onWrite: (a) => {
      return { testnet4: stringifyPrimitives(formToFile(a)) }
    },
  },
)
