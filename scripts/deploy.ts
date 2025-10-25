import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying FHE Game contracts with account:", deployer.address);

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`Network: ${network.name} (Chain ID: ${chainId})`);

  // InputVerification address - using official Zama deployment on Sepolia
  const inputVerificationAddress = "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F";
  console.log("Using InputVerification (Official Zama):", inputVerificationAddress);

  // Deploy ShadowMerchants
  const shadowFactory = await ethers.getContractFactory("ShadowMerchants");
  const shadowContract = await shadowFactory.deploy();
  await shadowContract.waitForDeployment();
  const shadowAddress = await shadowContract.getAddress();
  console.log("\nShadowMerchants deployed to:", shadowAddress);

  // Deploy MarketAuction with InputVerification address
  const auctionFactory = await ethers.getContractFactory("MarketAuction");
  const auctionContract = await auctionFactory.deploy(inputVerificationAddress);
  await auctionContract.waitForDeployment();
  const auctionAddress = await auctionContract.getAddress();
  console.log("MarketAuction deployed to:", auctionAddress);

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name} (Chain ID: ${chainId})`);
  console.log(`InputVerification (Zama): ${inputVerificationAddress}`);
  console.log(`ShadowMerchants: ${shadowAddress}`);
  console.log(`MarketAuction: ${auctionAddress}`);
  console.log("=".repeat(60));

  console.log("\n✅ Successfully deployed to Sepolia with FHEVM support!");
  console.log("   Using official Zama InputVerification gateway contract");
  console.log("   Relayer: https://relayer.testnet.zama.cloud");
  console.log("   RPC: https://eth-sepolia.public.blastapi.io");
  console.log("   FHE operations are now enabled!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
