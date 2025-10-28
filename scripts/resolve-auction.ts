import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const auctionId = process.argv[2] || "7";
  console.log(`🔧 Resolving Auction #${auctionId}...\n`);

  const contractAddress = "0x06011B31fD51aFE4BE9D3391345b852db13f1269";
  const abi = ["function resolveAuction(uint256 auctionId) external"];
  const contract = new ethers.Contract(contractAddress, abi, deployer);

  try {
    console.log("⏳ Sending resolve transaction...");
    const tx = await contract.resolveAuction(auctionId);
    console.log(`📤 Hash: ${tx.hash}\n`);

    const receipt = await tx.wait();
    console.log(`✅ Auction #${auctionId} resolved!`);
    console.log(`   Block: ${receipt?.blockNumber}`);
    console.log(`   Gas: ${receipt?.gasUsed.toString()}\n`);
  } catch (error: any) {
    console.error(`❌ Error:`, error.message);
  }
}

main().catch(console.error);
