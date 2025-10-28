import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚨 Using Emergency End Auction (immediate resolution)...\n");

  const contractAddress = "0x06011B31fD51aFE4BE9D3391345b852db13f1269";
  const auctionId = 4; // The quick auction we just created

  const abi = [
    "function emergencyEndAuction(uint256 auctionId) external"
  ];

  const contract = new ethers.Contract(contractAddress, abi, deployer);

  try {
    console.log(`📝 Forcing end of Auction #${auctionId}...\n`);

    const tx = await contract.emergencyEndAuction(auctionId);
    console.log(`📤 Transaction submitted: ${tx.hash}\n`);

    const receipt = await tx.wait();
    console.log(`✅ Auction ended successfully!`);
    console.log(`   Block: ${receipt?.blockNumber}`);
    console.log(`   Gas: ${receipt?.gasUsed.toString()}\n`);

    console.log("🎯 Next Steps:");
    console.log(`   1. Refresh http://localhost:3000`);
    console.log(`   2. Auction #${auctionId} should now be in 'Pending Resolution'`);
    console.log(`   3. Click 'Resolve Auction' to determine winner`);
    console.log(`   4. Claim reward as winner\n`);

  } catch (error: any) {
    console.error("❌ Error:");
    console.error("Message:", error.message);
  }
}

main().catch(console.error);
