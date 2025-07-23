import { VersionInfo, IMPOSSIBLE } from '@start9labs/start-sdk'
import { storeJson } from '../../fileModels/store.json'
import { coreCurrent as coreV28_1_3 } from 'bitcoind-startos/startos/install/versions'
import { bitcoinConfFile } from '../../fileModels/bitcoin.conf'
import { bitcoinConfDefaults } from '../../utils'
import { bitcoinConfDefaults as coreDefaults } from 'bitcoind-startos/startos/utils'

export const v28_1_0_3 = VersionInfo.of({
  version: '#knots:28.1:3-alpha.2',
  releaseNotes: 'Revamped for StartOS 0.4.0',
  migrations: {
    other: {

      [coreV28_1_3.options.version]: {
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
    },
    down: IMPOSSIBLE,
  },
}).satisfies(coreV28_1_3.options.version)
