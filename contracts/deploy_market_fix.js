const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/E1XNQatmPle1yikIOZrDO');
  const deployer = new ethers.Wallet('ad2407d2b9bc026428b68adef1255f6269b0c478667d7b4b41017cfdab44ac86', provider);

  console.log('Deploying updated MarketAuction from:', deployer.address);

  const MarketAuction = await ethers.getContractFactory("MarketAuction");
  const factory = MarketAuction.connect(deployer);
  const marketAuction = await factory.deploy();
  const receipt = await marketAuction.deploymentTransaction().wait(1);

  console.log('✅ MarketAuction redeployed to:', await marketAuction.getAddress());
}

main().catch(console.error);
