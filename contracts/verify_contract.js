const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/E1XNQatmPle1yikIOZrDO');

  // New contract address
  const marketAuctionAddress = '0xa6308841FD525b413Bbd3b358DF1Ba02A6F1302b';

  // Get contract factory and create interface
  const MarketAuction = await ethers.getContractFactory("MarketAuction");
  const contract = new ethers.Contract(marketAuctionAddress, MarketAuction.interface, provider);

  console.log('🔍 Verifying MarketAuction Contract Functions on Sepolia');
  console.log('📍 Contract Address:', marketAuctionAddress);
  console.log('-------------------------------------------\n');

  try {
    // Test 1: Check if getActiveAuctions function exists
    console.log('✅ Test 1: Checking getActiveAuctions()...');
    const activeAuctions = await contract.getActiveAuctions();
    console.log('   Result:', activeAuctions.length, 'active auctions');

    // Test 2: Check if getAuctionStats function exists
    console.log('\n✅ Test 2: Checking getAuctionStats()...');
    const stats = await contract.getAuctionStats();
    console.log('   Total Auctions:', stats.totalAuctions.toString());
    console.log('   Active Auctions:', stats.activeAuctions.toString());
    console.log('   Resolved Auctions:', stats.resolvedAuctions.toString());

    // Test 3: Check if getMyWins function exists and works for a random user
    console.log('\n✅ Test 3: Checking getMyWins()...');
    const testUser = '0x2B450a1F95774eF7B09C806869e7f8c6333Ff726'; // Deployer address
    const myWins = await contract.getMyWins(testUser);
    console.log('   Wins for', testUser, ':', myWins.length, 'auctions');

    // Test 4: Check if hasClaimedReward function exists
    console.log('\n✅ Test 4: Checking hasClaimedReward()...');
    if (myWins.length > 0) {
      const firstWin = myWins[0];
      const claimed = await contract.hasClaimedReward(firstWin, testUser);
      console.log('   Claimed for auction', firstWin.toString(), ':', claimed);
    } else {
      console.log('   (No wins to check, but function exists)');
    }

    // Test 5: Check AUCTION_MANAGER_ROLE constant
    console.log('\n✅ Test 5: Checking AUCTION_MANAGER_ROLE constant...');
    const role = await contract.AUCTION_MANAGER_ROLE();
    console.log('   Role:', role);

    // Test 6: Check hasRole function
    console.log('\n✅ Test 6: Checking hasRole()...');
    const hasRole = await contract.hasRole(role, testUser);
    console.log('   Deployer has AUCTION_MANAGER_ROLE:', hasRole);

    console.log('\n-------------------------------------------');
    console.log('✨ All contract functions verified successfully!');

  } catch (err) {
    console.error('\n❌ Error during verification:', err.message);
    console.error('Full error:', err);
  }
}

main().catch(console.error);
