import { VersionInfo, IMPOSSIBLE } from '@start9labs/start-sdk'
import { storeJson } from '../../fileModels/store.json'
import { coreCurrent as v29_1_0_2 } from 'bitcoind-startos/startos/install/versions'
import { bitcoinConfFile } from '../../fileModels/bitcoin.conf'
import { bitcoinConfDefaults } from '../../utils'
import { bitcoinConfDefaults as coreDefaults } from '../../utils'


export const v29_1_0_B1 = VersionInfo.of({
  version: '#knotsrdts:29.1:2-beta.2',
  releaseNotes: 'Revamped for StartOS 0.4.0',
  migrations: {
      other: {
  
        [v29_1_0_2.options.version]: {
          // Core -> Knots
          up: async ({ effects }) => {
            /*
              We want to merge bitcoin knots defaults into bitcoin.conf if those options
              were not present in bitcoin.conf at flavor migration
            */
            const existingBitcoinConf = await bitcoinConfFile.read().once()
            const nonConstDefaults: Record<string, any> = { ...bitcoinConfDefaults }
    
            if (existingBitcoinConf) {
              const newOptions: Record<string, any> = {}
              for (const k in nonConstDefaults) {
                if (!(k in existingBitcoinConf)) {
                  newOptions[k] = nonConstDefaults[k]
                }
              }
              await bitcoinConfFile.merge(effects, newOptions)
            } else {
              // Write the bitcoin.conf if it doesn't exist
              await bitcoinConfFile.write(effects, bitcoinConfDefaults)
            }
          },
          // Knots -> Core
          down: async ({ effects }) => {
            /*
              We want to merge bitcoin core defaults into bitcoin.conf if those options
              were not present in bitcoin.conf at flavor migration
            */
            const existingBitcoinConf = await bitcoinConfFile.read().once()
            const nonConstDefaults: Record<string, any> = { ...coreDefaults }
    
            if (existingBitcoinConf) {
              const newOptions: Record<string, any> = {}
              for (const k in nonConstDefaults) {
                if (!(k in existingBitcoinConf)) {
                  newOptions[k] = nonConstDefaults[k]
                }
              }
              await bitcoinConfFile.merge(effects, newOptions)
            } else {
              // Write the bitcoin.conf if it doesn't exist
              await bitcoinConfFile.write(effects, coreDefaults)
            }
          },
        },
      },
      up: async ({ effects }) => {
        await storeJson.write(effects, {
          reindexBlockchain: false,
          reindexChainstate: false,
          fullySynced: false,
          snapshotInUse: false,
        })
        const existingConf = await bitcoinConfFile.read().once()
  
        if (existingConf) return // Only write conf defaults if no existing bitcoin.conf found
  
        await bitcoinConfFile.write(effects, bitcoinConfDefaults)
      },
      down: IMPOSSIBLE,
    },
}).satisfies(v29_1_0_2.options.version)