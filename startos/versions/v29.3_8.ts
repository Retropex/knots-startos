import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'
import { bitcoinConfFile } from '../fileModels/bitcoin.conf'
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

export const v29_3_8 = VersionInfo.of({
  version: '#prerdtsknots:29.3:8',
  releaseNotes: {
    en_US:
      'Update to the latest Bitcoin Knots version, see the release note at https://github.com/bitcoinknots/bitcoin/releases/tag/v29.3.knots20260507',
    es_ES:
      'Actualiza a la última versión de Bitcoin Knots, consulta la nota de versión en https://github.com/bitcoinknots/bitcoin/releases/tag/v29.3.knots20260507',
    de_DE:
      'Aktualisieren Sie auf die neueste Bitcoin Knots-Version. Siehe die Versionshinweise unter https://github.com/bitcoinknots/bitcoin/releases/tag/v29.3.knots20260507',
    pl_PL:
      'Zaktualizuj do najnowszej wersji Bitcoin Knots, zobacz notatkę o wydaniu na https://github.com/bitcoinknots/bitcoin/releases/tag/v29.3.knots20260507',
    fr_FR:
      'Met à jour vers la dernière version de Bitcoin Knots, consultez la note de version à https://github.com/bitcoinknots/bitcoin/releases/tag/v29.3.knots20260507',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
    // TEMPORARY: pinned `:N` keys instead of caret regex (`^28`/`^29`/...).
    // Range-keyed `migrations.other` interacted with two StartOS bugs that
    // could leave the on-disk data version stuck as a flavored range and
    // dead-end a subsequent flavor switch. Both fixes ship in beta.9; once
    // a node is on beta.9 or newer we can revert to range keys (one entry
    // per Core major instead of one per Core `:N`).
    other: {
      ['28.3:10']: {
        // Core → Knots
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
        // Knots → Core
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
      ['29.3:10']: {
        // Core → Knots
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
        // Knots → Core
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
      ['30.2:10']: {
        // Core → Knots: drop coinstatsindex written by Core 30+ at the new
        // path; Knots 29 only reads the old indexes/coinstats/ path, which
        // Core 30 deliberately preserved for downgrade.
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
          await rm('/media/startos/volumes/main/indexes/coinstatsindex', {
            recursive: true,
            force: true,
          }).catch(console.error)
        },
        // Knots → Core
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
      ['31.0:10']: {
        // Core → Knots: drop fee_estimates.dat (v31 bumped
        // CURRENT_FEES_FILE_VERSION 149900 → 309900; ≤30 hard-fails) and
        // coinstatsindex (same reason as 30.x).
        up: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
          await rm('/media/startos/volumes/main/fee_estimates.dat', {
            force: true,
          }).catch(console.error)
          await rm('/media/startos/volumes/main/indexes/coinstatsindex', {
            recursive: true,
            force: true,
          }).catch(console.error)
        },
        // Knots → Core
        down: async ({ effects }) => {
          await bitcoinConfFile.merge(effects, mempoolReset)
        },
      },
      ['#knots:29.3:7']: {
        up: async ({ effects }) => {
          // no reset since it's the same implementation
        },
        down: async ({ effects }) => {
          // no reset since it's the same implementation
        },
      },
      ['#knots:29.3:8']: {
        up: async ({ effects }) => {
          // no reset since it's the same implementation
        },
        down: async ({ effects }) => {
          // no reset since it's the same implementation
        },
      },
      ['#knotsrdts:29.3:7']: {
        up: async ({ effects }) => {
          // no reset since it's the same implementation
        },
        down: async ({ effects }) => {
          // no reset since it's the same implementation
        },
      },
    },
  },
}).satisfies('29.3:10')
