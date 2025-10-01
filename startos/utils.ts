import { sdk } from './sdk'
export const rpcInterfaceId = 'rpc'
export const peerInterfaceId = 'peer'
export const zmqInterfaceId = 'zmq'
export const zmqPort = 28332
export const peerPort = 18333
export const rpcPort = 8332

export const rootDir = '/root/.bitcoin'

export const unprunedRpcbind = '0.0.0.0:8332'
export const unprunedRpcallowIp = '0.0.0.0/0'

export const prunedRpcbind = '127.0.0.1:18332'
export const prunedRpcallowip = '127.0.0.1/32'

export type GetNetworkInfo = {
  connections: number
  connections_in: number
  connections_out: number
}

export type GetBlockchainInfo = {
  chain: string
  blocks: number
  headers: number
  bestblockhash: string
  difficulty: number
  mediantime: number
  verificationprogress: number
  initialblockdownload: boolean
  chainwork: string
  size_on_disk: number
  pruned: boolean
  pruneheight?: number
  automatic_pruning?: boolean
  prune_target_size?: number
  softforks: Record<
    string,
    {
      type: string
      bip9?: {
        status: string
        bit?: number
        start_time: number
        timeout: number
        since: number
        statistics?: {
          period: number
          threshold: number
          elapsed: number
          count: number
          possible: boolean
        }
      }
      height?: number
      active: boolean
    }
  >
  warnings: string
}

export const bitcoinConfDefaults = {
  // RPC
  rpcbind: unprunedRpcbind,
  rpcallowip: unprunedRpcallowIp,
  rpcauth: undefined,
  rpcservertimeout: 30,
  rpcthreads: 4,
  rpcworkqueue: 16,
  rpccookiefile: '.cookie',
  whitebind: '0.0.0.0:8333',
  bind: undefined,
  deprecatedrpc: 'create_bdb',

  // Mempool
  persistmempool: true,
  maxmempool: 300,
  mempoolexpiry: 336,
  mempoolfullrbf: true,
  permitbaremultisig: false,
  datacarrier: true,
  datacarriersize: 83,
  rejectparasites: true,
  rejecttokens: false,
  minrelaytxfee: 0.00001,
  bytespersigop: 20,
  bytespersigopstrict: 20,
  limitancestorcount: 25,
  limitancestorsize: 101,
  limitdescendantcount: 25,
  limitdescendantsize: 101,
  permitbarepubkey: false,
  maxscriptsize: 1_650,
  datacarriercost: 1,
  acceptnonstddatacarrier: false,
  dustrelayfee: 0.00003,
  permitephemeral: undefined,
  permitbareanchor: true,
  permitbaredatacarrier: false,
  maxtxlegacysigops: 2500,
  acceptunknownwitness: true,
  minrelaycoinblocks: undefined,
  minrelaymaturity: undefined,
  mempoolreplacement: 'fee,-optin',
  mempooltruc: 'accept',

  // Peers
  listen: true,
  onlynet: undefined,
  externalip: undefined,
  v2transport: true,
  connect: undefined,
  addnode: undefined,

  // Wallet
  disablewallet: false,
  avoidpartialspends: false,
  discardfee: 0.0001,

  // Other
  blockmaxsize: 3_985_000,
  blockmaxweight: 3_985_000,
  blockreconstructionextratxn: 32768,
  blockreconstructionextratxnsize: 10,
  blocknotify: undefined,
  prune: 0,
  zmqpubrawblock: 'tcp://0.0.0.0:28332',
  zmqpubhashblock: 'tcp://0.0.0.0:28332',
  zmqpubrawtx: 'tcp://0.0.0.0:28333',
  zmqpubhashtx: 'tcp://0.0.0.0:28333',
  zmqpubsequence: 'tcp://0.0.0.0:28333',
  natpmp: false,
  maxuploadtarget: 0,
  uaspoof: '/Satoshi:29.1.0/',

  coinstatsindex: false,
  txindex: false,
  dbcache: 450,

  peerbloomfilters: false,
  blockfilterindex: 'basic',
  peerblockfilters: false,
} as const

export function getExteralAddresses() {
  return sdk.Value.dynamicSelect(async ({ effects }) => {
    const peerInterface = await sdk.serviceInterface
      .getOwn(effects, peerInterfaceId)
      .const()

    const urls = peerInterface?.addressInfo?.public.format() || []

    const nonOnionUrl = urls.find((u: string) => !u.includes('onion'))
    if (nonOnionUrl && !nonOnionUrl.endsWith(':8333')) {
      urls.push(nonOnionUrl.replace(/:.*/, ':8333'))
    }

    if (urls.length === 0) {
      return {
        name: 'External Address',
        description:
          "Address at which your node can be reached by peers. Select 'none' if you do not want your node to be reached by peers.",
        values: { none: 'none' },
        default: 'none',
      }
    }

    const urlsWithNone = urls.reduce(
      (obj: Record<string, string>, url: string) => ({ ...obj, [url]: url }),
      {} as Record<string, string>,
    )

    urlsWithNone['none'] = 'none'

    return {
      name: 'External Address',
      description:
        "Address at which your node can be reached by peers. Select 'none' if you do not want your node to be reached by peers.",
      values: urlsWithNone,
      default: urls.find((u: string) => u.endsWith('.onion')) || '',
    }
  })
}
