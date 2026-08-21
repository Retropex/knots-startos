import { activateRDTS } from '../actions/activaterdts'
import { bitcoinConfFile } from '../fileModels/bitcoin.conf'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const taskConsensusRules = sdk.setupOnInit(async (effects) => {
  const consensusrules = await bitcoinConfFile
    .read((b) => b.consensusrules)
    .const(effects)
  if (consensusrules !== 'rdts') {
    await sdk.action.createOwnTask(effects, activateRDTS, 'critical', {
      reason: i18n(
        'Please confirm your understanding that this version of Bitcoin Knots will eventually enforce the BIP-110 Reduced Data Temporary Softfork (RDTS) consensus rules.',
      ),
    })
  }
})
