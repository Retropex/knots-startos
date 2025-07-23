import { sdk } from '../sdk'
import { other } from './config/other'
import { mempoolConfig } from './config/mempool'
import { peerConfig } from './config/peers'
import { rpcConfig } from './config/rpc'
import { deleteCoinstatsIndex } from './deleteCoinstatsIndex'
import { deletePeers } from './deletePeers'
import { deleteRpcAuth } from './deleteRpcAuth'
import { deleteTxIndex } from './deleteTxIndex'
import { generateRpcUser } from './generateRpcAuth'
import { generateRpcUserDependent } from './generateRpcUserDependent'
import { reindexBlockchain } from './reindexBlockchain'
import { reindexChainstate } from './reindexChainstate'
import { runtimeInfo } from './runtimeInfo'
import { assumeutxo } from './assumeutxo'
import { prioritiseTransaction } from './prioritiseTransaction'
import { signMessage } from './sign'
import { getaddress } from './getaddress'
import { getbalance } from './getbalance'
import { sendAllCoin } from './sendallcoin'
import { sendCoin } from './sendcoin'

export const actions = sdk.Actions.of()
  .addAction(runtimeInfo)
  .addAction(deleteCoinstatsIndex)
  .addAction(deletePeers)
  .addAction(deleteTxIndex)
  .addAction(reindexBlockchain)
  .addAction(reindexChainstate)
  .addAction(other)
  .addAction(rpcConfig)
  .addAction(generateRpcUser)
  .addAction(deleteRpcAuth)
  .addAction(mempoolConfig)
  .addAction(peerConfig)
  .addAction(generateRpcUserDependent)
  .addAction(assumeutxo)
  .addAction(prioritiseTransaction)
  .addAction(signMessage)
  .addAction(getaddress)
  .addAction(getbalance)
  .addAction(sendAllCoin)
  .addAction(sendCoin)
