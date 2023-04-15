import { Contract, Provider } from "zksync-web3";
import fs from "fs";

import * as dotenv from "dotenv";
dotenv.config();

// The address of the counter smart contract
const COUNTER_ADDRESS = process.env.COUNTER_ADDRESS as string;
// The ABI of the counter smart contract
const jsonData = fs.readFileSync("artifacts-zk/contracts/Counter.sol/Counter.json");
const data = JSON.parse(jsonData.toString());
const COUNTER_ABI = data.abi;

async function main() {
  // Initializing the zkSync provider
  const l2Provider = new Provider("https://testnet.era.zksync.dev");

  const counterContract = new Contract(COUNTER_ADDRESS, COUNTER_ABI, l2Provider);

  console.log(`The counter value is ${(await counterContract.value()).toString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
