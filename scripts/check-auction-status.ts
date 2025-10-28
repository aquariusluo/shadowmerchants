import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("📋 Checking auction status...\n");

  const contractAddress = "0x06011B31fD51aFE4BE9D3391345b852db13f1269";
  const abi = [
    "function getActiveAuctions() external view returns (uint256[])",
    "function getAuctionInfo(uint256 auctionId) external view returns (uint8 goodType, uint256 startTime, uint256 endTime, bool isActive, bool isResolved, uint8 participantCount, address creator)"
  ];

  const contract = new ethers.Contract(contractAddress, abi, deployer);

  try {
    // Get all active auctions
    const auctionIds = await contract.getActiveAuctions();
    console.log(`✅ Found ${auctionIds.length} active auctions\n`);

    const now = Math.floor(Date.now() / 1000);

    for (const auctionId of auctionIds) {
      const info = await contract.getAuctionInfo(auctionId.toString());
      const timeRemaining = Math.max(0, Number(info.endTime) - now);
      const isExpired = timeRemaining === 0;

      console.log(`📌 Auction #${auctionId.toString()}`);
      console.log(`   Good Type: ${Number(info.goodType)}`);
      console.log(`   Status: ${info.isActive ? "ACTIVE" : "INACTIVE"} | ${info.isResolved ? "RESOLVED" : "PENDING"}`);
      console.log(`   Start Time: ${new Date(Number(info.startTime) * 1000).toLocaleString()}`);
      console.log(`   End Time: ${new Date(Number(info.endTime) * 1000).toLocaleString()}`);
      console.log(`   Time Remaining: ${timeRemaining}s ${isExpired ? "✅ EXPIRED" : "⏳ NOT YET EXPIRED"}`);
      console.log(`   Bidders: ${Number(info.participantCount)}`);
      console.log(`   Creator: ${info.creator.substring(0, 10)}...\n`);
    }

    if (auctionIds.length === 0) {
      console.log("⭕ No active auctions found");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(console.error);
