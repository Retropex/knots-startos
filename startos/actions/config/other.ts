import { sdk } from '../../sdk'
import { bitcoinConfFile, fullConfigSpec } from '../../fileModels/bitcoin.conf'
import { storeJson } from '../../fileModels/store.json'
import { i18n } from '../../i18n'

export const otherConfig = sdk.Action.withInput(
  // id
  'other-config',

  // metadata
  async ({ effects }) => ({
    name: i18n('Other Settings'),
    description: i18n('Edit more values in bitcoin.conf'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Configuration'),
    visibility: 'enabled',
  }),

  // form input specification
  fullConfigSpec.filter({
    softwareexpiry: true,
    zmqEnabled: true,
    txindex: true,
    blocknotify: true,
    templateconstruction: true,
    blockreconstruction: true,
    coinstatsindex: true,
    wallet: true,
    prune: true,
    dbcache: true,
    dbbatchsize: true,
    blockfilters: true,
    peerbloomfilters: true,
    natpmp: true,
    maxuploadtarget: true,
  }),

  // optionally pre-fill the input form
  async ({ effects }) => bitcoinConfFile.read().once(),

  // the execution function
  async ({ effects, input }) => {
    const oldPrune = await bitcoinConfFile.read((c) => c.prune).once()

    await bitcoinConfFile.merge(effects, input)

    // Switching from pruned to archival requires a full reindex
    if (oldPrune && !input.prune) {
      await storeJson.merge(effects, { reindexBlockchain: true })
    }
  },
)
