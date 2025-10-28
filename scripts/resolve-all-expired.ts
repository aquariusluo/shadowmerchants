import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🔧 Batch resolving all expired auctions...\n");

  const contractAddress = "0x06011B31fD51aFE4BE9D3391345b852db13f1269";
  const checkAbi = [
    "function getActiveAuctions() external view returns (uint256[])",
    "function getAuctionInfo(uint256 auctionId) external view returns (uint8 goodType, uint256 startTime, uint256 endTime, bool isActive, bool isResolved, uint8 participantCount, address creator)",
    "function resolveAuction(uint256 auctionId) external"
  ];

  const contract = new ethers.Contract(contractAddress, checkAbi, deployer);

  try {
    // Get all active auctions
    const auctionIds = await contract.getActiveAuctions();
    console.log(`📋 Found ${auctionIds.length} active auctions\n`);

    const now = Math.floor(Date.now() / 1000);
    const expiredAuctions = [];

    // Check which ones are expired
    for (const auctionId of auctionIds) {
      const info = await contract.getAuctionInfo(auctionId.toString());
      const timeRemaining = Math.max(0, Number(info.endTime) - now);

      if (timeRemaining === 0) {
        expiredAuctions.push(auctionId.toString());
      }
    }

    if (expiredAuctions.length === 0) {
      console.log("✅ No expired auctions to resolve");
      return;
    }

    console.log(`🎯 Resolving ${expiredAuctions.length} expired auction(s):\n`);

    // Resolve each expired auction
    for (const auctionId of expiredAuctions) {
      try {
        console.log(`⏳ Resolving Auction #${auctionId}...`);
        const tx = await contract.resolveAuction(auctionId);
        const receipt = await tx.wait();
        console.log(`✅ Auction #${auctionId} resolved! (Block: ${receipt?.blockNumber})\n`);
      } catch (err: any) {
        console.error(`❌ Failed to resolve Auction #${auctionId}: ${err.message}\n`);
      }
    }

    console.log("🎉 Batch resolution complete!");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
