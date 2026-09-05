import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'
import { bitcoinConfFile } from '../fileModels/bitcoin.conf'

export const current = VersionInfo.of({
  version: '#knots:29.4.1:7',
  releaseNotes: {
    en_US: `Update to Bitcoin Knots v29.4.1.knots20260508`,
    es_ES: `Actualización a Bitcoin Knots v29.4.1.knots20260508`,
    de_DE: `Aktualisierung auf Bitcoin Knots v29.4.1.knots20260508`,
    pl_PL: `Aktualizacja do Bitcoin Knots v29.4.1.knots20260508`,
    fr_FR: `Mise à jour vers Bitcoin Knots v29.4.1.knots20260508`,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
    other: {
      // `#knotsrdts` (the "Bitcoin Knots plus BIP-110" build) is being
      // retired. Users on it can move here; preserve their RDTS acceptance
      // so the consensusrules critical-task gate doesn't re-fire. No
      // `down` — `#knotsrdts` is being de-listed, so the inverse path
      // can't be selected by a user.
      ['^#knotsrdts:29.3']: {
        up: async ({ effects }) => {},
      },
    },
  },
})

