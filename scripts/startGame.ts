// Using Hardhat Runtime Environment
import hre from "hardhat";

async function main() {
  // Get signers using hre.ethers
  const [deployer] = await hre.ethers.getSigners();
  console.log("Starting game with account:", deployer.address);

  // Get the deployed contract
  const contractAddress = "0x5603712980FAB2a66bE32682eB67c527F4F696a0";
  const shadowContract = await hre.ethers.getContractAt("ShadowMerchants", contractAddress);

  // Start the game
  console.log("Calling startGame()...");
  const tx = await shadowContract.startGame();
  console.log("Transaction hash:", tx.hash);

  // Wait for confirmation
  const receipt = await tx.wait();
  console.log("✓ Game started! Block:", receipt.blockNumber);

  // Try to get game status with error handling
  try {
    const gameInfo = await shadowContract.getGameInfo();
    console.log("\n📊 Game Status:");
    console.log("   Active:", gameInfo[4]);
    console.log("   Current Round:", Number(gameInfo[0]));
    console.log("   Players:", Number(gameInfo[3]));
  } catch (error) {
    console.log("\n📊 Game Status:");
    console.log("   Note: Game info retrieval skipped due to potential ABI issues");
    console.log("   Game has been successfully started");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
