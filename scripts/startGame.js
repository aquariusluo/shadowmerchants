"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
async function main() {
    const [deployer] = await hardhat_1.ethers.getSigners();
    console.log("Starting game with account:", deployer.address);
    const contractAddress = "0x5603712980FAB2a66bE32682eB67c527F4F696a0";
    const shadowContract = await hardhat_1.ethers.getContractAt("ShadowMerchants", contractAddress);
    console.log("Calling startGame()...");
    const tx = await shadowContract.startGame();
    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("✓ Game started! Block:", receipt.blockNumber);
    const gameInfo = await shadowContract.getGameInfo();
    console.log("\n📊 Game Status:");
    console.log("   Active:", gameInfo[4]);
    console.log("   Current Round:", Number(gameInfo[0]));
    console.log("   Players:", Number(gameInfo[3]));
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
//# sourceMappingURL=startGame.js.map