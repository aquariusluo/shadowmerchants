const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/E1XNQatmPle1yikIOZrDO');
  const deployer = new ethers.Wallet('ad2407d2b9bc026428b68adef1255f6269b0c478667d7b4b41017cfdab44ac86', provider);

  const marketAuctionAddress = '0xa6308841FD525b413Bbd3b358DF1Ba02A6F1302b';
  
  // CHANGE THIS TO YOUR WALLET ADDRESS
  const userToGrant = '0xE90F94fe6F5deB84E616C5A8AC69200A4794B55e'; // Example - replace with your wallet address

  console.log('🔐 Granting AUCTION_MANAGER_ROLE...');
  console.log('  Contract:', marketAuctionAddress);
  console.log('  User:', userToGrant);
  console.log('  Deployer:', deployer.address);

  const MarketAuction = await ethers.getContractFactory("MarketAuction");
  const contract = new ethers.Contract(marketAuctionAddress, MarketAuction.interface, deployer);

  try {
    // Get the role ID
    const AUCTION_MANAGER_ROLE = await contract.AUCTION_MANAGER_ROLE();
    console.log('  Role ID:', AUCTION_MANAGER_ROLE);

    // Check if user already has role
    const hasRole = await contract.hasRole(AUCTION_MANAGER_ROLE, userToGrant);
    console.log('  User already has role?', hasRole);

    if (!hasRole) {
      console.log('\n📝 Sending grantRole transaction...');
      const tx = await contract.grantRole(AUCTION_MANAGER_ROLE, userToGrant);
      const receipt = await tx.wait();
      
      console.log('✅ Role granted successfully!');
      console.log('  Transaction:', receipt.hash);
      
      // Verify
      const hasRoleAfter = await contract.hasRole(AUCTION_MANAGER_ROLE, userToGrant);
      console.log('  Verified - user now has role:', hasRoleAfter);
    } else {
      console.log('✅ User already has AUCTION_MANAGER_ROLE');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main().catch(console.error);
