import { bitcoinConfFile } from '../fileModels/bitcoin.conf'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  acknowledge: Value.toggle({
    name: i18n('I acknowledge'),
    description: null,
    default: false,
  }),
})

export const activateRDTS = sdk.Action.withInput(
  // id
  'activate-rdts',

  // metadata
  async ({ effects }) => ({
    name: i18n('Activate RDTS'),
    description: '',
    warning: i18n(
      'This version of Bitcoin Knots will eventually enforce the BIP-110 Reduced Data Temporary Softfork ("RDTS") network upgrade, which fixes critical vulnerabilities in long-standing network design. To avoid applying this upgrade by accident, this version asks for explicit confirmation. Important: because this upgrade already has broad community support, skipping this update or reverting to an older software version does not reject it. Running outdated software after any network upgrade may leave your node vulnerable to displaying fake or fraudulent transactions. To effectively reject this upgrade, you need to run alternative software designed to split away from the upgraded network. Learn more at https://bitcoinknots.org/learn/2026-rdts. If you are not ready to adopt the RDTS upgrade, you can alternatively switch to the "Bitcoin Knots (pre-RDTS)" version available in the Start9 marketplace, which is the same version of Bitcoin Knots without RDTS support.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'hidden',
  }),

  // input spec
  inputSpec,

  // optionally pre-fill form
  async ({ effects }) => ({}),

  // execution function
  async ({ effects, input }) => {
    if (!input.acknowledge) {
      throw new Error(i18n('Please acknowledge'))
    }
    // Consent record only: the shipped RUNTIME_WARN binary enforces RDTS
    // regardless of this option (see forkRecovery.ts).
    await bitcoinConfFile.merge(effects, { consensusrules: 'rdts' })
  },
)
