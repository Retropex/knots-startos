import { setupManifest } from '@start9labs/start-sdk'
import { SDKImageInputSpec } from '@start9labs/start-sdk/base/lib/types/ManifestTypes'

const BUILD = process.env.BUILD || ''

const arch =
  BUILD === 'x86_64' || BUILD === 'aarch64' ? [BUILD] : ['x86_64', 'aarch64']

export const manifest = setupManifest({
  id: 'bitcoind',
  title: 'Bitcoin Knots (BIP 110 UASF)',
  license: 'MIT',
  donationUrl: null,
  wrapperRepo: 'https://github.com/Retropex/knots-startos',
  upstreamRepo: 'https://github.com/dathonohm/bitcoin',
  supportSite: 'https://github.com/Retropex/knots-startos/issues',
  marketingSite: 'https://bitcoinknots.org/',
  docsUrl: 'https://github.com/Retropex/knots-startos/blob/next/docs/instructions.md',
  description: {
    short: 'A Bitcoin Full Node by Bitcoin Knots',
    long: 'Take control of your digital sovereignty by choosing Bitcoin Knots to run your node! With Bitcoin Knots enhanced configuration options, you can fine-tune your node to help keep the network clean and resilient, actively reducing unnecessary load from spam or parasitic transactions.',
  },
  volumes: ['main', 'proxy'],
  images: {
    bitcoind: {
      source: {
        dockerBuild: {
          workdir: './',
          dockerfile: 'Dockerfile',
        },
      },
      arch,
    } as SDKImageInputSpec,
    proxy: {
      source: {
        dockerTag: 'ghcr.io/start9labs/btc-rpc-proxy',
      },
      arch,
    } as SDKImageInputSpec,
    python: {
      source: {
        dockerTag: 'python:3.13.2-alpine',
      },
      arch,
    } as SDKImageInputSpec,
  },
  hardwareRequirements: { arch },
  alerts: {
    install: null,
    update: null,
    uninstall:
      "Uninstalling Bitcoin Knots will result in permanent loss of data. Without a backup, any funds stored on your node's default hot wallet will be lost forever. If you are unsure, we recommend making a backup, just to be safe.",
    restore:
      'Restoring Bitcoin Knots will overwrite its current data. You will lose any transactions recorded in watch-only wallets, and any funds you have received to the hot wallet, since the last backup.',
    start: null,
    stop: null,
  },
  dependencies: {},
})
