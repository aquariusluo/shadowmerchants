"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
async function main() {
    const [deployer] = await hardhat_1.ethers.getSigners();
    console.log("Deploying FHE Game contracts with account:", deployer.address);
    const shadowFactory = await hardhat_1.ethers.getContractFactory("ShadowMerchants");
    const shadowContract = await shadowFactory.deploy();
    await shadowContract.waitForDeployment();
    const shadowAddress = await shadowContract.getAddress();
    console.log("ShadowMerchants deployed to:", shadowAddress);
    const auctionFactory = await hardhat_1.ethers.getContractFactory("MarketAuction");
    const auctionContract = await auctionFactory.deploy();
    await auctionContract.waitForDeployment();
    const auctionAddress = await auctionContract.getAddress();
    console.log("MarketAuction deployed to:", auctionAddress);
    const grantRoleTx = await shadowContract.grantAuctionRole(auctionAddress);
    await grantRoleTx.wait();
    console.log("Granted auction role to MarketAuction.");
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
//# sourceMappingURL=deploy.js.map