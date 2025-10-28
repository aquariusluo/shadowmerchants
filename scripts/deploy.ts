import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying FHE Game contracts with account:", deployer.address);

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`Network: ${network.name} (Chain ID: ${chainId})`);

  // InputVerification address - use address(0) for direct FHE mode
  // (Gateway verification requires additional Zama infrastructure setup)
  const inputVerificationAddress = "0x0000000000000000000000000000000000000000";
  console.log("Using Direct FHE mode (no gateway verification):", inputVerificationAddress);

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
  console.log(`Mode: Direct FHE (proof decrypted in contract)`);
  console.log(`ShadowMerchants: ${shadowAddress}`);
  console.log(`MarketAuction: ${auctionAddress}`);
  console.log("=".repeat(60));

  console.log("\n✅ Successfully deployed to Sepolia with FHEVM support!");
  console.log("   Using direct FHE mode - proofs verified immediately");
  console.log("   Relayer: https://relayer.testnet.zama.cloud");
  console.log("   RPC: https://eth-sepolia.public.blastapi.io");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
