import * as zksync from "zksync-web3";
import { utils, Wallet } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

import * as dotenv from "dotenv";
dotenv.config();

const hre = require("hardhat");

// Insert the address of the governance contract
const GOVERNANCE_ADDRESS = process.env.GOVERNANCE_ADDRESS;
const zkSyncProvider = new zksync.Provider("https://testnet.era.zksync.dev/");
const ethereumProvider = ethers.getDefaultProvider(process.env.GOERLI_RPC_URL as string);

// An example of a deploy script that will deploy and call a simple contract.
async function main(hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for the Counter contract`);

  // Initialize the wallet.
  const wallet = new Wallet(process.env.PRIVATE_KEY as string, zkSyncProvider, ethereumProvider);

  // Create deployer object and load the artifact of the contract you want to deploy.
  const deployer = new Deployer(hre, wallet);
  const artifact = await deployer.loadArtifact("Counter");

  // Deposit some funds to L2 to be able to perform deposits.
  const deploymentFee = await deployer.estimateDeployFee(artifact, [GOVERNANCE_ADDRESS]);
  const depositHandle = await deployer.zkWallet.deposit({
    to: deployer.zkWallet.address,
    token: utils.ETH_ADDRESS,
    amount: deploymentFee.mul(2),
  });
  // Wait until the deposit is processed on zkSync
  await depositHandle.wait();

  const parsedFee = ethers.utils.formatEther(deploymentFee.toString());
  console.log(`The deployment is estimated to cost ${parsedFee} ETH`);

  // Deploy this contract. The returned object will be of a `Contract` type, similar to the ones in `ethers`.
  // The address of the governance is an argument for contract constructor.
  const counterContract = await deployer.deploy(artifact, [GOVERNANCE_ADDRESS]);

  // Show the contract info.
  const contractAddress = counterContract.address;
  console.log(`${artifact.contractName} was deployed to ${contractAddress}`);
}

main(hre).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});