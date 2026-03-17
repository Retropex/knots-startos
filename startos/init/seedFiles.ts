import { utils } from '@start9labs/start-sdk'
import * as diskusage from 'diskusage'
import {
  archivalMin,
  bitcoinConfFile,
  defaultDatacarriercost,
  defaultDbcache,
  minPrune,
} from '../fileModels/bitcoin.conf'
import { i2pdConfFile } from '../fileModels/i2pd.conf'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { i2PSamAddress } from '../utils'

const diskUsage = utils.once(() => diskusage.check('/'))

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return

  await storeJson.merge(effects, {})

  await bitcoinConfFile.merge(effects, {
    zmqEnabled: true,
    blockfilters: { blockfilterindex: true },
    dbcache: defaultDbcache,
    natpmp: false,
    datacarriercost: defaultDatacarriercost,
    ...((await diskUsage()).total < archivalMin ? { prune: minPrune } : {}),
    raw: {
      i2psam: i2PSamAddress,
    },
  })

  await i2pdConfFile.merge(effects, {})
})
