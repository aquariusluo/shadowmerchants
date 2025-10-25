const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/E1XNQatmPle1yikIOZrDO');
  const deployer = new ethers.Wallet('ad2407d2b9bc026428b68adef1255f6269b0c478667d7b4b41017cfdab44ac86', provider);
  
  console.log('Deploying fresh ShadowMerchants from:', deployer.address);
  
  const ShadowMerchants = await ethers.getContractFactory("ShadowMerchants");
  const factory = ShadowMerchants.connect(deployer);
  const shadowMerchants = await factory.deploy();
  const receipt = await shadowMerchants.deploymentTransaction().wait(1);
  
  console.log('✅ ShadowMerchants redeployed to:', await shadowMerchants.getAddress());
}

main().catch(console.error);
