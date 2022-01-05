import dotenv from 'dotenv';
dotenv.config()
if (!process.env.WS) {
  throw new Error(".env not found")
}
import { Keyring } from "@polkadot/keyring";
import * as API from '@polkadot/api'
const cloverTypes = {
  AccountInfo: {
    nonce: "Index",
    consumers: "RefCount",
    providers: "RefCount",
    data: "AccountData",
  },
  Amount: "i128",
  Keys: "SessionKeys4",
  AmountOf: "Amount",
  Balance: "u128",
  Rate: "FixedU128",
  Ratio: "FixedU128",
  EcdsaSignature: "[u8; 65]",
  EvmAddress: "H160",
  EthereumTxHash: "H256",
  BridgeNetworks: {
    _enum: ["BSC", "Ethereum"],
  },
};
class Service {
  api
  seed
  async init() {
    const wsProvider = new API.WsProvider(process.env.WS);
    const api = await API.ApiPromise.create({
      provider: wsProvider,
      types: cloverTypes
    });
    const CLOVER_SEEDS = process.env.CLOVER_SEEDS || "0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a"
    const keyring = new Keyring({ type: "sr25519" });
    const seed = keyring.addFromUri(CLOVER_SEEDS, null, "sr25519");
    this.api = api
    this.seed = seed
    this.accountBalance.bind(this)
  }
  async accountBalance  (api, address, alias = null, log = false) {
    const accountId = address;
    const { data: balance } = await api.query.system.account(accountId);
  
    if (log) console.log(`
  Date: $${new Date()}
  Balance of ${alias ? alias : ''} ${accountId} is:
    Free: ${balance.free}
    Reserved: ${balance.reserved}
    Misc Frozen: ${balance.miscFrozen}
    Fee Frozen: ${balance.feeFrozen}
    `);
    return balance
  }
  
  async transfer (api, substrateAccount, toAddress, value, nonce = 0, log = true) {
    if (!nonce) nonce = await api.rpc.system.accountNextIndex(substrateAccount.address);
    // let currentBalance = await this.accountBalance(api, substrateAccount.address)
    // if (currentBalance?.free < value) {
    //     console.log(`Account ${substrateAccount.address} does not has enough balance, ${currentBalance?.free.toString()} vs required ${(value).toString()}`)
    //     return
    // }
  
    return new Promise((resolve, reject) => {
        try {
            api.tx.balances.transfer(toAddress, value).signAndSend(
                substrateAccount,
                {
                    nonce
                },
                async ({ events = [], status }) => {
                    if (status.isFinalized) {
                        if (log) console.log(`Time: ${(new Date()).toLocaleString()} transfered from ${substrateAccount.address} to ${toAddress} amount: ${value} nonce ${nonce}`)
                        resolve();
                    }
                }
            ).catch(err => {
              console.log(`Time: ${(new Date()).toLocaleString()} transfered from ${substrateAccount.address} to ${toAddress} amount: ${value} nonce ${nonce} failed`, err.message)
              reject(err)
            })
        } catch (err) {
            // reject(err);
            console.log(`Time: ${(new Date()).toLocaleString()} transfered from ${substrateAccount.address} to ${toAddress} amount: ${value} nonce ${nonce} failed`, err.message)
            reject(err)
        }
        
    });
  }
  
}

const service = new Service()
export default service

