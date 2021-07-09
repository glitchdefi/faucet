import dotenv from 'dotenv';
dotenv.config()
import express from 'express';
import svgCaptcha from 'svg-captcha';
const router = express.Router();
import pkg from '@glitchdefi/web3';
import level from 'level'
import bcrypt from 'bcrypt';
if (!process.env.RPC_URL) {
  throw new Error(".env not found")
}
const { GlitchWeb3 } = pkg;
const MIN_BALANCE = 1e18
const FAUCET_AMOUNT=3e18
const web3 = new GlitchWeb3(process.env.RPC_URL)
const db = level('my-db')
const FAUCET_TIME = parseInt(process.env.FAUCET_TIME) || 28800000
const saltRounds = 10;
function genHash(text) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(text, saltRounds, function (err, hash) {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  })  
}
// ROUTER

// --- GET
router.get('/', async (req, res) => {
  try {
    var captcha = svgCaptcha.create();
    const hash = await genHash(captcha.text)
    res.render('faucet', { post: '/faucet', captcha: captcha.data, hash: hash, path: req.path })
  } catch (err){
    res.render('faucet', { post: '/faucet', error: "Something Wrong! Please try again", path: "/faucet" })
  }

});

// --- SUBMIT
router.post('/', async (req, res) => {
  try {
    var captcha = svgCaptcha.create();
    const newHash = await genHash(captcha.text)
    const { verify, hash, address } = req.body
    const result = await new Promise((resolve, reject) => {
      bcrypt.compare(verify, hash, function (err, result) {
        if (err) reject(err)
        resolve(result)
      });
    })

    if (!result) {
      res.render('faucet', { post: '/faucet', captcha: captcha.data, hash: newHash, error: "Invalid Captcha", path: "/faucet" })
      return
    }
    let lastFaucet = 0
    try {
      lastFaucet = await db.get(address)
    } catch (err) {

    }
    try {
      const now = Date.now()
      if (now - lastFaucet < FAUCET_TIME) {
        res.render('faucet', { post: '/faucet', captcha: captcha.data, hash: newHash, error: "TOO_FAST", path: "/faucet" })
        return
      }

      let balance = await web3.getBalance(address)
      if (balance.balance > MIN_BALANCE) {
        res.render('faucet', { post: '/faucet', captcha: captcha.data, hash: newHash, data: `balance: ${balance.balance.toString()}`, path: "/faucet" })
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

      await web3.sendTransactionCommit({ from: account.address, to: address, value: FAUCET_AMOUNT, fee: 1e14 })
      balance = await web3.getBalance(address)
      await db.put(address, now)
      res.render('faucet', { post: '/faucet', captcha: captcha.data, hash: newHash,data: `balance: ${balance.balance.toString()}`, path: "/faucet" })
    } catch (e) {
      console.log(e)
      res.render('faucet', { post: '/faucet', captcha: captcha.data, hash: newHash,error: 'Something went wrong', path: "/faucet" })
    }
  } catch (err) {
    console.log(err)
    res.render('faucet', { post: '/faucet', error: 'Something went wrong', path: "/faucet" })
  }
});

export default router;