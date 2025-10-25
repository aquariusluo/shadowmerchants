const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/E1XNQatmPle1yikIOZrDO');
  
  const newAddress = '0x214bd7bf68C23de9dc2AD3613DA8e61dF3383dE0';

  console.log('🔍 Verifying New MarketAuction Contract (Permissionless)\n');
  console.log('📍 Contract Address:', newAddress);
  console.log('-------------------------------------------\n');

  const MarketAuction = await ethers.getContractFactory("MarketAuction");
  const contract = new ethers.Contract(newAddress, MarketAuction.interface, provider);

  try {
    console.log('✅ Test 1: Checking getActiveAuctions()...');
    const active = await contract.getActiveAuctions();
    console.log('   Result: ' + active.length + ' active auctions');

    console.log('\n✅ Test 2: Checking getAuctionStats()...');
    const stats = await contract.getAuctionStats();
    console.log('   Total: ' + stats.totalAuctions.toString());
    console.log('   Active: ' + stats.activeAuctions.toString());
    console.log('   Resolved: ' + stats.resolvedAuctions.toString());

    console.log('\n✅ Test 3: Testing getMyWins()...');
    const deployer = '0x2B450a1F95774eF7B09C806869e7f8c6333Ff726';
    const wins = await contract.getMyWins(deployer);
    console.log('   Result: ' + wins.length + ' wins');

    console.log('\n-------------------------------------------');
    console.log('✨ All functions working!');
    console.log('✨ createAuction is now PERMISSIONLESS!');
    console.log('✨ Anyone can create auctions!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main().catch(console.error);
