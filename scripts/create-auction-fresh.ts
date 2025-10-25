/**
 * Create auction with FRESH encrypted proof
 * Generates proof with Zama SDK, then immediately submits
 * Usage: npx hardhat run scripts/create-auction-fresh.ts --network sepolia
 */

import { ethers } from "hardhat";
import ZamaGatewayService from "../client/src/services/zamaGateway";

async function main() {
  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║    CREATE AUCTION WITH FRESH ENCRYPTED PROOF              ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");

  // Get signer
  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();
  console.log("📝 Signer:", address);
  console.log("");

  // STEP 1: Generate fresh proof from Zama SDK
  console.log("STEP 1: Generating fresh encrypted reserve price...");
  const gateway = new ZamaGatewayService();

  try {
    const encryptedReserve = await gateway.encryptUint64(500);

    const goodType = 5;
    const reservePriceHex = encryptedReserve.handleHex || "";
    const proofHex = encryptedReserve.proofHex || "";
    const durationSeconds = 360;

    console.log("✅ Encryption complete");
    console.log("");
    console.log("PARAMETERS:");
    console.log(`  goodType: ${goodType}`);
    console.log(`  reservePrice: ${reservePriceHex}`);
    console.log(`  proof: ${proofHex.substring(0, 60)}...`);
    console.log(`  durationSeconds: ${durationSeconds}`);
    console.log("");

    // STEP 2: Encode the function call
    console.log("STEP 2: Encoding function call...");

    // Contract details
    const contractAddress = "0xdcac98a77A522e175701D756F4d3387674089343";
    const iface = new ethers.Interface([
      {
        inputs: [
          { name: "goodType", type: "uint8" },
          { name: "reservePrice", type: "bytes32" },
          { name: "proof", type: "bytes" },
          { name: "durationSeconds", type: "uint256" },
        ],
        name: "createAuction",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
      },
    ]);

    const encodedData = iface.encodeFunctionData("createAuction", [
      goodType,
      reservePriceHex,
      proofHex,
      durationSeconds,
    ]);

    console.log("✅ Function encoded");
    console.log("");

    // STEP 3: Send transaction
    console.log("STEP 3: Submitting transaction...");

    const tx = await signer.sendTransaction({
      to: contractAddress,
      data: encodedData,
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
      console.log("TRANSACTION DETAILS:");
      console.log(`  Block: ${receipt.blockNumber}`);
      console.log(`  Gas used: ${receipt.gasUsed?.toString()}`);
      console.log(`  TX Hash: ${tx.hash}`);
      console.log("");
      console.log("VIEW ON ETHERSCAN:");
      console.log(`https://sepolia.etherscan.io/tx/${tx.hash}`);
      console.log("");
      console.log("═══════════════════════════════════════════════════════════");
    } else {
      console.log("❌ Transaction failed!");
      console.log(`Status: ${receipt?.status}`);
    }
  } catch (error: any) {
    console.error("");
    console.error("❌ ERROR:");
    if (error.message) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  }
}

main().catch(console.error);
