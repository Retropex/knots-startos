import { sdk } from '../sdk'
import * as fs from 'fs/promises'
import { rootDir, bitcoinMounts } from '../utils'
import { i18n } from '../i18n'

export const deleteTestnetChain = sdk.Action.withoutInput(
  // id
  'delete-testnet-chain',

  // metadata
  async ({ effects }) => ({
    name: 'Delete testnet data',
    description: 'Delete testnet data for a complete resync',
    warning: 'All testnet data, including testnet wallet will be deleted!',
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  }),

  // execution function
  async ({ effects }) => {
    await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'bitcoind' },
      bitcoinMounts,
      'delete-testnet-data',
      async (subc) => {
        await fs.rmdir(`${subc.rootfs}/${rootDir}/testnet4/`, {
          recursive: true,
        })
      },
    )

    return {
      version: '1',
      title: i18n('Success'),
      message: 'Successfully deleted testnet data',
      result: null,
    }
  },
)
