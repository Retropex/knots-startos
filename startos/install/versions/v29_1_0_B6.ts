import { VersionInfo, IMPOSSIBLE } from '@start9labs/start-sdk'
import { bitcoinConfFile } from '../../fileModels/bitcoin.conf'
import { bitcoinConfDefaults } from '../../utils'
import { v29_2_0_2 } from 'bitcoin-core-startos/startos/install/versions/v29.2.0_2-beta.3'
import { v29_2_0_9 } from 'bitcoind-knots/startos/install/versions/v29_2_0_9-beta.0'
import { storeJson } from '../../fileModels/store.json'
import { sdk } from '../../sdk'
import { mainMounts } from '../../main'
const { whitebind, bind } = bitcoinConfDefaults

export const v29_1_0_B6 = VersionInfo.of({
  version: '#garbageman:29.1:6-beta.6',
  releaseNotes: 'Revamped for StartOS 0.4.0',
  migrations: {
      up: async ({ effects }) => {
        await sdk.SubContainer.withTemp(
          effects,
          { imageId: 'bitcoind' },
          mainMounts,
          'nocow',
          async (subc) => {
            await subc.execFail(['chattr', '-R', '+C', '/.bitcoin'])
          },
        )
        const store = await storeJson.read().once()
  
        if (!store) {
          await storeJson.write(effects, {
            reindexBlockchain: false,
            reindexChainstate: false,
            fullySynced: false,
            snapshotInUse: false,
          })
        }
        const existingConf = await bitcoinConfFile.read().once()
  
        if (existingConf) {
          await bitcoinConfFile.merge(effects, {
            rpcuser: undefined,
            rpcpassword: undefined,
            bind,
            whitebind,
            whitelist: undefined,
          })
          return
        } // Only write conf defaults if no existing bitcoin.conf found
  
        await bitcoinConfFile.write(effects, bitcoinConfDefaults)
      },
      down: IMPOSSIBLE,
      other: {
        [v29_2_0_9.options.version]: {
          up: async () => {},
          down: async () => {},
        }
      },
    },
}).satisfies(v29_2_0_2.options.version)