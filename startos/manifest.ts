import { setupManifest } from '@start9labs/start-sdk'
import { execSync } from 'child_process'

const SOURCE_DATE_EPOCH = execSync('git show -s --format=%ct HEAD').toString().trim()

export const manifest = setupManifest({
  id: 'bitcoind',
  title: 'Bitcoin Knots',
  license: 'MIT',
  donationUrl: null,
  wrapperRepo: 'https://github.com/retropex/bitcoin-knots-startos',
  upstreamRepo: 'https://github.com/bitcoinknots/bitcoin',
  supportSite: 'https://github.com/retropex/bitcoin-knots-startos',
  marketingSite: 'https://bitcoinknots.org/',
  docsUrl: 'https://github.com/Start9Labs/bitcoin-knots-startos/blob/update/040/instructions.md',
  description: {
    short: 'A Bitcoin Full Node by Bitcoin Knots',
    // @TODO better description for Knots
    long: 'Bitcoin is an innovative payment network and a new kind of money. Bitcoin uses peer-to-peer technology to operate with no central authority or banks; managing transactions and the issuing of bitcoins is carried out collectively by the network. Bitcoin is open-source; its design is public, nobody owns or controls Bitcoin and everyone can take part. Through many of its unique properties, Bitcoin allows exciting uses that could not be covered by any previous payment system.',
  },
  volumes: ['main', 'proxy'],
  images: {
    bitcoind: {
      source: {
        dockerBuild: {
          workdir: './',
          dockerfile: 'Dockerfile',
          buildArgs: {
            SOURCE_DATE_EPOCH: SOURCE_DATE_EPOCH,
          }
        },
      },
    },
    proxy: {
      source: {
        dockerTag: 'ghcr.io/start9labs/btc-rpc-proxy',
      },
    },
    python: {
      source: {
        dockerTag: 'python:3.13.2-alpine',
      },
    },
  },
  hardwareRequirements: {},
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
