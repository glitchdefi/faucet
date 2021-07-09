import express from "express";
import bodyParser from "body-parser";
import dotenv from 'dotenv';
dotenv.config()
import path from 'path';
import pug from 'pug';
import timeout from 'connect-timeout';
const PORT = process.env.PORT;
if (!PORT) {
  throw new Error(".env not found")
}

import faucetRoutes from "./routes/faucet.js";
const __dirname = path.resolve(path.dirname(''));
var pub = __dirname + '/public';
const app = express();

app.use(timeout('300s'))
app.use(express.static('public'));
app.engine('pug', pug.__express)
app.use(haltOnTimedout)
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded());
function haltOnTimedout(req, res, next) {
  if (!req.timedout) next()
}
app.set('views', __dirname + '/views')
app.set('view engine', 'pug')

app.get('/', faucetRoutes)

app.use("/faucet", faucetRoutes);
app.all("*", (req, res) =>
  res.send("You've tried reaching a route that doesn't exist.")
);

app.listen(PORT, () =>
  console.log(`Server running on port: http://localhost:${PORT}`)
);
