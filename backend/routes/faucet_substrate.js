import dotenv from 'dotenv';
dotenv.config()
import express from 'express';
import svgCaptcha from 'svg-captcha';
const router = express.Router();
import level from 'level'
import bcrypt from 'bcrypt';
if (!process.env.WS) {
  throw new Error(".env not found")
}
import substrateService from '../service/substrate.js'
const MIN_BALANCE = BigInt(1e18)
const FAUCET_AMOUNT = BigInt(1e18)

const db = level('my-db')
const FAUCET_TIME = parseInt(process.env.FAUCET_TIME) || 28800000
const FAUCET_TIME_STR = process.env.FAUCET_TIME_STR || '8 hours'
const saltRounds = 10;

let queue = {}

const ROUTER_ENDPOINT = '/faucet'
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
    res.render('faucet', { post: ROUTER_ENDPOINT, captcha: captcha.data, hash: hash, path: req.path })
  } catch (err){
    res.render('faucet', { post: ROUTER_ENDPOINT, error: "Something Wrong! Please try again", path: ROUTER_ENDPOINT })
  }

});

// --- SUBMIT

router.post('/', async (req, res) => {
  try {
    var captcha = svgCaptcha.create();
    const newHash = await genHash(captcha.text)
    if (!req || !req.body) {
      console.log('empty req')
      res.render('faucet', { post: ROUTER_ENDPOINT, captcha: captcha.data, hash: newHash, error: "Invalid Captcha", path: ROUTER_ENDPOINT })
      return
    }
    const { verify, hash, address } = req.body
    const result = await new Promise((resolve, reject) => {
      bcrypt.compare(verify, hash, function (err, result) {
        if (err) reject(err)
        resolve(result)
      });
    })

    if (!result) {
      console.log('wrong hash', verify, hash, result)
      res.render('faucet', { post: ROUTER_ENDPOINT, captcha: captcha.data, hash: newHash, error: "Invalid Captcha", path: ROUTER_ENDPOINT })
      return
    }

    if (queue[address]) {
      res.render('faucet', { post: ROUTER_ENDPOINT, captcha: captcha.data, hash: newHash, error: `You just requested GLITCH please wait for ${FAUCET_TIME_STR} to request again`, path: ROUTER_ENDPOINT })
      return
    } else {
      queue[address] = true
    }

    let lastFaucet = 0
    try {
      lastFaucet = parseInt(await db.get(address));
    } catch (err) {}
    try {
      const now = Date.now()
      if (now - lastFaucet < FAUCET_TIME) {
        res.render('faucet', { post: ROUTER_ENDPOINT, captcha: captcha.data, hash: newHash, error: `You just requested GLITCH please wait for ${FAUCET_TIME_STR} to request again`, path: ROUTER_ENDPOINT })
        return
      }
      const {api, seed, accountBalance, transfer} = substrateService
      let balance = await accountBalance(api, address)
      if (balance?.free > MIN_BALANCE) {
        res.render('faucet', { post: ROUTER_ENDPOINT, captcha: captcha.data, hash: newHash, error: "You are already rich", path: ROUTER_ENDPOINT })
        return
      }

      await transfer(api, seed, address, FAUCET_AMOUNT)
      balance = await accountBalance(api, address)
      await db.put(address, now)
      res.render('faucet', { post: ROUTER_ENDPOINT, captcha: captcha.data, hash: newHash,data: `balance: ${balance?.free.toString()}`, path: ROUTER_ENDPOINT })
    } catch (e) {
      console.log(e)
      res.render('faucet', { post: ROUTER_ENDPOINT, captcha: captcha.data, hash: newHash,error: 'Something went wrong', path: ROUTER_ENDPOINT })
    } finally {
      delete queue[address]
    }
  } catch (err) {
    console.log(err)
    res.render('faucet', { post: ROUTER_ENDPOINT, error: 'Something went wrong', path: ROUTER_ENDPOINT })
  }
});

export default router;