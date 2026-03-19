import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { v_28_3_5_b3 } from 'bitcoin-core-startos/startos/install/versions/v28.3.5.b3'
import { v_29_3_5_b3 } from 'bitcoin-core-startos/startos/install/versions/v29.3.5.b3'
import { v_30_2_5_b3 } from 'bitcoin-core-startos/startos/install/versions/v30.2.5.b3'
import { bitcoinConfFile } from '../../fileModels/bitcoin.conf'
/**
 * Reset all mempool settings to undefined so the new flavor's upstream
 * defaults take effect. This is the primary reason users switch between
 * Core and Knots.
 */
const mempoolReset = {
  // Shared mempool settings
  persistmempool: undefined,
  maxmempool: undefined,
  mempoolexpiry: undefined,
  mempoolfullrbf: undefined,
  permitbaremultisig: undefined,
  datacarrier: undefined,
  datacarriersize: undefined,
  // Knots-specific mempool settings
  permitbaredatacarrier: undefined,
  rejectparasites: undefined,
  rejecttokens: undefined,
  mempoolreplacement: undefined,
  mempooltruc: undefined,
  permitbareanchor: undefined,
  permitephemeral: undefined,
  minrelaytxfee: undefined,
  bytespersigop: undefined,
  bytespersigopstrict: undefined,
  maxtxlegacysigops: undefined,
  limitancestorcount: undefined,
  limitancestorsize: undefined,
  limitdescendantcount: undefined,
  limitdescendantsize: undefined,
  permitbarepubkey: undefined,
  maxscriptsize: undefined,
  datacarriercost: undefined,
  acceptnonstddatacarrier: undefined,
  dustrelayfee: undefined,
  acceptunknownwitness: undefined,
  minrelaycoinblocks: undefined,
  minrelaymaturity: undefined,
}

export const v29_3_1_b7 = VersionInfo.of({
  version: '#knots:29.3:1-beta.7',
  releaseNotes: {
    en_US: 'Multiple bug fixes',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
    other: {
      [v_28_3_5_b3.options.version]: {
        // Core → Knots
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
        // Knots → Core
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
      [v_29_3_5_b3.options.version]: {
        // Core → Knots: reset mempool so Knots upstream defaults apply
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
        // Knots → Core: reset mempool so Core upstream defaults apply
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
      [v_30_2_5_b3.options.version]: {
        // Core → Knots
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
        // Knots → Core
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
    },
  },
}).satisfies(v_29_3_5_b3.options.version)
