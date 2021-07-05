import express from "express";
import bodyParser from "body-parser";
import path from 'path';
import { RecaptchaV3 as Recaptcha } from 'express-recaptcha';
import pug from 'pug';
var recaptchaV3 = new Recaptcha('SITE_KEY', 'SECRET_KEY', { callback: 'cb' });
const PORT = process.env.PORT;
if (!PORT) {
  throw new Error(".env not found")
}

import faucetRoutes from "./routes/faucet.js";
const __dirname = path.resolve(path.dirname(''));
var pub = __dirname + '/public';
const app = express();
app.engine('pug', pug.__express)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(express.static(pub));
app.set('views', __dirname + '/views')
app.set('view engine', 'pug')

app.get('/v3', recaptchaV3.middleware.render, (req, res) => {
  res.render('index', { post: '/v3', captcha: res.recaptcha, path: req.path })
})
app.post('/v3', recaptchaV3.middleware.verify, (req, res) => {
  res.render('index', {
    post: '/v3',
    error: req.recaptcha.error,
    path: req.path,
    data: JSON.stringify(req.recaptcha.data),
  })
})
app.use("/faucet", faucetRoutes);
app.all("*", (req, res) =>
  res.send("You've tried reaching a route that doesn't exist.")
);

app.listen(PORT, () =>
  console.log(`Server running on port: http://localhost:${PORT}`)
);
