import { sdk } from '../sdk'
import { assumeutxo } from './assumeutxo'
import { backupwallet } from './backupwallet'
import { autoconfig } from './config/autoconfig'
import { mempoolConfig } from './config/mempool'
import { otherConfig } from './config/other'
import { peerConfig } from './config/peers'
import { rpcConfig } from './config/rpc'
import { deleteCoinstatsIndex } from './deleteCoinstatsIndex'
import { deletePeers } from './deletePeers'
import { deleteRpcAuth } from './deleteRpcAuth'
import { deleteTxIndex } from './deleteTxIndex'
import { generateRpcUser } from './generateRpcUser'
import { generateRpcUserDependent } from './generateRpcUserDependent'
import { getaddress } from './getaddress'
import { getbalance } from './getbalance'
import { prioritiseTransaction } from './prioritiseTransaction'
import { reindexBlockchain } from './reindexBlockchain'
import { reindexChainstate } from './reindexChainstate'
import { removewallet } from './removewallet'
import { restorewallet } from './restorewallet'
import { runtimeInfo } from './runtimeInfo'
import { sendAllCoin } from './sendallcoin'
import { selectWallet } from './selectwallet'
import { sendCoin } from './sendcoin'
import { signMessage } from './sign'

export const actions = sdk.Actions.of()
  .addAction(mempoolConfig)
  .addAction(peerConfig)
  .addAction(rpcConfig)
  .addAction(assumeutxo)
  .addAction(deleteCoinstatsIndex)
  .addAction(deletePeers)
  .addAction(deleteRpcAuth)
  .addAction(deleteTxIndex)
  .addAction(generateRpcUser)
  .addAction(generateRpcUserDependent)
  .addAction(otherConfig)
  .addAction(reindexBlockchain)
  .addAction(reindexChainstate)
  .addAction(runtimeInfo)
  .addAction(autoconfig)
  .addAction(selectWallet)
  .addAction(getbalance)
  .addAction(getaddress)
  .addAction(sendCoin)
  .addAction(sendAllCoin)
  .addAction(signMessage)
  .addAction(prioritiseTransaction)
  .addAction(backupwallet)
  .addAction(restorewallet)
  .addAction(removewallet)
