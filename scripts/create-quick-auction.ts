import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("📝 Creating quick auction for immediate resolution testing...\n");

  const contractAddress = "0x06011B31fD51aFE4BE9D3391345b852db13f1269";
  const abi = [
    "function createAuction(uint8 goodType, bytes32 reservePrice, bytes calldata proof, uint256 durationSeconds) external returns (uint256)"
  ];

  const contract = new ethers.Contract(contractAddress, abi, deployer);

  try {
    // Simple plaintext encrypted data (no proof = plaintext mode)
    const reservePrice = "0x00000000000000000000000000000000000000000000000000000000000001f4"; // 500 in hex
    const proof = "0x"; // Empty proof = plaintext mode

    console.log("✅ Creating auction with 10-second duration...");
    console.log(`   Reserve Price: 500 (plaintext)`);
    console.log(`   Duration: 10 seconds\n`);

    const tx = await contract.createAuction(
      1, // SPICES
      reservePrice,
      proof,
      10 // 10 seconds duration
    );

    console.log(`📤 Transaction submitted: ${tx.hash}\n`);

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed!`);
    console.log(`   Block: ${receipt?.blockNumber}`);
    console.log(`   Gas: ${receipt?.gasUsed.toString()}\n`);

    console.log("🎯 Next Steps:");
    console.log("   1. Wait 10 seconds for auction to expire");
    console.log("   2. Refresh http://localhost:3000");
    console.log("   3. Click 'Resolve Auction' button");
    console.log("   4. Verify winner was determined");
    console.log("   5. Claim reward\n");

  } catch (error: any) {
    console.error("❌ Error:");
    console.error("Message:", error.message);
  }
}

main().catch(console.error);
