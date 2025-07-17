import { bitcoinConfFile } from '../fileModels/bitcoin.conf'
import { sdk } from '../sdk'
import { rootDir } from '../utils'
import { rpcPort } from '../utils'
import { mainMounts } from '../main'
const { InputSpec, Value } = sdk

export const inputSpec = InputSpec.of({
  address: Value.dynamicText(async ({ effects }) => {
    return {
      name: 'Address',
      description: 'The Bitcoin address you want to send the funds.',
      required: true,
      default: null,
      patterns: [
        {
          regex: '^[a-zA-Z0-9]+$',
          description: 'Must be alphanumeric.',
        },
      ],
    }
  }),
  fee: Value.dynamicText(async ({ effects }) => {
    return {
      name: 'Fee',
      description: 'Fees in sat/vbytes you want to pay for the transaction.',
      required: true,
      default: null,
    }
  }),
})

export const sendAllCoin = sdk.Action.withInput(
  // id
  'send-all-coin',

  // metadata
  async ({ effects }) => ({
    name: 'Send All Coins',
    description:
      'Send all coins to a bitcoin address.',
    warning: null,
    allowedStatuses: 'any',
    group: 'Wallet',
    visibility: 'enabled',
  }),

  // input spec
  inputSpec,

  // optionally pre-fill form
  async ({ effects }) => {},

  // execution function
  async ({ effects, input }) => {
    const { address, fee } = input

    const mountpoint = '/scripts'
    
    const conf = (await bitcoinConfFile.read().const(effects))!

    const res = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'bitcoind' },
      sdk.Mounts.of().mountVolume ({
      volumeId: 'main',
      subpath: null, 
      mountpoint: rootDir,  
      readonly: false,
      }).mountAssets({ subpath: null, mountpoint}),
      'Sign Message',
      async (subc) => {
        return await subc.execFail([
          `${mountpoint}/sendallcoin.sh`,
          `-conf=${rootDir}/bitcoin.conf`,
          `-rpccookiefile=${rootDir}/.cookie`,
          `-rpcport=${conf.prune ? 18332 : rpcPort}`,
          `${address}`,
          `${fee}`,
        ])
      },
    )
    
    return {
      version: '1',
      title: 'Sucess',
      message: `TXID: ${res.stdout}`,
      result: null,
    }
  },
)
