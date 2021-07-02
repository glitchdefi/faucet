import express from "express";
import bodyParser from "body-parser";

import faucetRoutes from "./routes/faucet.js";

const app = express();
const PORT = 5000;

app.use(bodyParser.json());

app.use("/faucet", faucetRoutes);
app.get("/", (req, res) => res.send("Welcome to the Faucet API!"));
app.all("*", (req, res) =>
  res.send("You've tried reaching a route that doesn't exist.")
);

app.listen(PORT, () =>
  console.log(`Server running on port: http://localhost:${PORT}`)
);
