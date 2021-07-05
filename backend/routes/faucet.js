import dotenv from 'dotenv';
dotenv.config()
import express from 'express';
const router = express.Router();
import { GlitchWeb3 } from '@glitchdefi/web3'
import level from 'level'
if (!process.env.RPC_URL) {
  throw new Error(".env not found")
}
const web3 = new GlitchWeb3(process.env.RPC_URL)
const db = level('my-db')
const FAUCET_TIME = parseInt(process.env.FAUCET_TIME) || 28800000
router.get('/:address', async (req, res) => {
  let lastFaucet = 0
  const address = req.params.address
  try {
    lastFaucet = await db.get(address)
  } catch (err) {
    
  }
  try {
    const now = Date.now()
    if (now - lastFaucet < FAUCET_TIME) {
      res.send({ success: false, reason: "TOO_FAST" }).status(400)
      return
    }

    let balance = await web3.getBalance(address)
    if (balance.balance > 50e18) {
      res.send({ address, balance: balance.balance.toString() }).status(200)
      return
    }

    const ms = web3.contract('system.faucet').methods
    const request = from => {
      return ms.request().sendCommit({
        signers: from,
        payer: 'system.faucet',
        fee: 1e14
      })
    }
    const account = web3.wallet.importAccount(process.env.ACCOUNT_PRIV_KEY)
    const addr1 = account.address
    balance = await web3.getBalance(addr1)
    if (balance.balance < BigInt(1e18)) {
      await request(addr1)
    }

    await web3.sendTransactionCommit({ from: account.address, to: address, value: 50e18, fee: 1e14 })
    balance = await web3.getBalance(address)
    const data = { success: true, address, balance: balance.balance.toString() }
    res.send(data).status(200)
    await db.put(address, now)
  } catch (e) {
    console.log(e)
    res.send({ success: false,message: 'Something went wrong' }).status(400)
  }
})
export default router;