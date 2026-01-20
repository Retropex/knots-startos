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
      description: 'The Bitcoin address you want to use to sign the message.',
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
  message: Value.dynamicText(async ({ effects }) => {
    return {
      name: 'Message',
      description: 'The message you want to sign.',
      required: true,
      default: null,
    }
  }),
})

export const signMessage = sdk.Action.withInput(
  // id
  'sign-message',

  // metadata
  async ({ effects }) => ({
    name: 'Sign Message',
    description:
      'Sign a message with one of your Bitcoin addresses.',
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
    const { address, message } = input

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
          `${mountpoint}/sign.sh`,
          `-conf=${rootDir}/bitcoin.conf`,
          `-rpccookiefile=${rootDir}/.cookie`,
          `-rpcport=${conf.prune ? 18332 : rpcPort}`,
          `${address}`,
          `${message}`,
        ])
      },
    )
    
    return {
      version: '1',
      title: 'Sucess',
      message: `Your signature: ${res.stdout}`,
      result: null,
    }
  },
)
