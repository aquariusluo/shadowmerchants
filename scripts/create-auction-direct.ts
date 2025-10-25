/**
 * Direct transaction submission without Zama SDK
 * Uses hardhat to submit transaction directly
 * Usage: npx hardhat run scripts/create-auction-direct.ts --network sepolia
 */

import { ethers } from "hardhat";

async function main() {
  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║         CREATE AUCTION - DIRECT HARDHAT SUBMISSION        ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("📝 Signer:", await signer.getAddress());

  // Contract address
  const contractAddress = "0xdcac98a77A522e175701D756F4d3387674089343";

  // Pre-generated values
  const goodType = 5;
  const reservePrice = "0xb4e7e1bb528cd0daeed9225f383409214b53162f78000000000000aa36a70500";
  const proof = "0x0101b4e7e1bb528cd0daeed9225f383409214b53162f78000000000000aa36a70500ca6e46e8896920d4c12513f4f6c414a35ac6eb621165307364f02992ab9a6ee404d2fb5a67f7a7b4844b081d7573d4962fad56e3a8deb7e313451da4493a584a1b00";
  const durationSeconds = 360;

  console.log("PARAMETERS:");
  console.log(`  goodType: ${goodType}`);
  console.log(`  reservePrice: ${reservePrice}`);
  console.log(`  proof: ${proof.substring(0, 60)}...`);
  console.log(`  durationSeconds: ${durationSeconds}`);
  console.log("");

  try {
    console.log("Submitting transaction...");

    // Send raw transaction using ethers
    const tx = await signer.sendTransaction({
      to: contractAddress,
      data: "0xda6e5d600000000000000000000000000000000000000000000000000000000000000005b4e7e1bb528cd0daeed9225f383409214b53162f78000000000000aa36a7050000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000016800000000000000000000000000000000000000000000000000000000000000640101b4e7e1bb528cd0daeed9225f383409214b53162f78000000000000aa36a70500ca6e46e8896920d4c12513f4f6c414a35ac6eb621165307364f02992ab9a6ee404d2fb5a67f7a7b4844b081d7573d4962fad56e3a8deb7e313451da4493a584a1b00",
      gasLimit: 500000,
    });

    console.log("✅ Transaction submitted!");
    console.log(`Hash: ${tx.hash}`);
    console.log("");
    console.log("Waiting for confirmation...");

    const receipt = await tx.wait();

    if (receipt?.status === 1) {
      console.log("");
      console.log("═══════════════════════════════════════════════════════════");
      console.log("🎉 AUCTION CREATED SUCCESSFULLY!");
      console.log("═══════════════════════════════════════════════════════════");
      console.log("");
      console.log(`Block: ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed}`);
      console.log(`TX Hash: ${tx.hash}`);
      console.log("");
      console.log("View on Etherscan:");
      console.log(`https://sepolia.etherscan.io/tx/${tx.hash}`);
      console.log("");
    } else {
      console.log("❌ Transaction failed!");
    }
  } catch (error: any) {
    console.error("");
    console.error("❌ ERROR:");
    console.error(error.message || error);
  }
}

main().catch(console.error);
