import { BigNumber, Contract, ethers, Wallet } from "ethers";
import { Provider, utils } from "zksync-web3";
import fs from "fs";

import * as dotenv from "dotenv";
dotenv.config();

// The ABI of the Counter and Governance smart contract
const jsonDataCounter = fs.readFileSync("artifacts-zk/contracts/Counter.sol/Counter.json");
const dataCounter = JSON.parse(jsonDataCounter.toString());
const COUNTER_ABI = dataCounter.abi;

const jsonDataGovernance = fs.readFileSync("artifacts-zk/contracts/Governance.sol/Governance.json");
const dataGovernance = JSON.parse(jsonDataGovernance.toString());
const GOVERNANCE_ABI = dataGovernance.abi;

const GOVERNANCE_ADDRESS = process.env.GOVERNANCE_ADDRESS as string;
const COUNTER_ADDRESS = process.env.COUNTER_ADDRESS as string;

async function main() {
  // Ethereum L1 provider
//   const l1Provider = ethers.providers.getDefaultProvider("goerli");
  const l1Provider = ethers.getDefaultProvider(process.env.GOERLI_RPC_URL as string);

  // Governor wallet, the same one as the one that deployed the governance contract
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, l1Provider);

  const govcontract = new Contract(GOVERNANCE_ADDRESS, GOVERNANCE_ABI, wallet);

  // Initializing the L2 provider
  const l2Provider = new Provider("https://testnet.era.zksync.dev");
  // Getting the current address of the zkSync L1 bridge
  const zkSyncAddress = await l2Provider.getMainContractAddress();
  console.log(`The current address of the zkSync L1 bridge is ${zkSyncAddress}`);
  // Getting the `Contract` object of the zkSync bridge
  const zkSyncContract = new Contract(zkSyncAddress, utils.ZKSYNC_MAIN_ABI, wallet);

  // Encoding L1 transaction is the same way it is done on Ethereum.
  const counterInterface = new ethers.utils.Interface(COUNTER_ABI);
  const data = counterInterface.encodeFunctionData("increment", []);
  console.log(`Encoding L1 transaction is finished.`);

  // The price of L1 transaction requests depend on the gas price used in the call,
  // so we should explicitly fetch the gas price before the call.
  const gasPrice = await l1Provider.getGasPrice();
  console.log(`The price of L1 transaction is ${gasPrice} WEI`);

  // Here we define the constant for gas limit. 
  // There is currently no way to get the exact gasLimit required for an L1->L2 tx.
  // You can read more on that in the tip below
  const gasLimit = BigNumber.from(20000000);
  // Getting the cost of the execution in Wei.
  const baseCost = await zkSyncContract.l2TransactionBaseCost(gasPrice, gasLimit, ethers.utils.hexlify(data).length);
  
  console.log(`The transaction is start.`);
  const tx = await govcontract.callZkSync(zkSyncAddress, COUNTER_ADDRESS, data, gasLimit, utils.REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT, {
    // Passing the necessary ETH `value` to cover the fee for the operation
    value: baseCost,
    gasPrice,
  });
  

  // Waiting until the L1 tx is complete.
  await tx.wait();
  console.log(`The transaction is finished.`);

  // Getting the TransactionResponse object for the L2 transaction corresponding to the execution call
  const l2Response = await l2Provider.getL2TransactionFromPriorityOp(tx);

  // The receipt of the L2 transaction corresponding to the call to the counter contract
  const l2Receipt = await l2Response.wait();
  console.log(l2Receipt);
}

// We recommend always using this async/await pattern to properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
