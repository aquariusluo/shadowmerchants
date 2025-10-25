/**
 * Submit createAuction transaction directly using private key
 * Bypasses Etherscan Write Contract interface (which has encoding issues)
 * Usage: npx ts-node scripts/submit-create-auction.ts
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import ZamaGatewayService from "../client/src/services/zamaGateway";

dotenv.config();

// Contract ABI - only createAuction function needed
const CONTRACT_ABI = [
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
];

const CONTRACT_ADDRESS = "0xdcac98a77A522e175701D756F4d3387674089343";

async function main() {
  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║         CREATE AUCTION - DIRECT TRANSACTION               ║");
  console.log("║   (Bypassing Etherscan Write Contract interface)          ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");

  // STEP 1: Get private key
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error("❌ ERROR: PRIVATE_KEY not found in .env");
    process.exit(1);
  }

  // STEP 2: Connect to network
  console.log("STEP 1: Connecting to Sepolia...");
  const RPC_URL = "https://eth-sepolia.public.blastapi.io";
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const address = await signer.getAddress();

  console.log(`✅ Connected: ${address}`);
  console.log("");

  // STEP 3: Check balance
  console.log("STEP 2: Checking ETH balance...");
  const balance = await provider.getBalance(address);
  const balanceETH = ethers.formatEther(balance);
  console.log(`✅ Balance: ${balanceETH} Sepolia ETH`);

  if (parseFloat(balanceETH) < 0.1) {
    console.warn("⚠️  WARNING: Low balance. You might not have enough gas!");
  }
  console.log("");

  // STEP 4: Generate encrypted proof
  console.log("STEP 3: Generating encrypted reserve price (500)...");
  const gateway = new ZamaGatewayService();
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

  // STEP 5: Create contract instance
  console.log("STEP 4: Creating contract instance...");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  console.log(`✅ Contract: ${CONTRACT_ADDRESS}`);
  console.log("");

  // STEP 6: Estimate gas
  console.log("STEP 5: Estimating gas...");
  let gasEstimate;
  try {
    gasEstimate = await (contract.createAuction as any).estimateGas(
      goodType,
      reservePriceHex,
      proofHex,
      durationSeconds
    );
    console.log(`✅ Gas estimate: ${gasEstimate.toString()} gas`);
  } catch (error: any) {
    console.log("⚠️  Could not estimate gas, using 500k buffer");
    gasEstimate = BigInt(500000);
  }

  const gasLimit = (gasEstimate * 120n) / 100n; // 20% buffer
  console.log(`✅ Gas limit (with 20% buffer): ${gasLimit.toString()}`);
  console.log("");

  // STEP 7: Submit transaction
  console.log("STEP 6: Submitting transaction...");
  console.log("(Confirm in wallet popup if prompted)");
  console.log("");

  try {
    const tx = await (contract.createAuction as any)(
      goodType,
      reservePriceHex,
      proofHex,
      durationSeconds,
      { gasLimit }
    );

    console.log(`✅ Transaction submitted!`);
    console.log("");
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("");

    // STEP 8: Wait for confirmation
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait();

    if (receipt?.status === 1) {
      console.log("");
      console.log("═══════════════════════════════════════════════════════════");
      console.log("🎉 AUCTION CREATED SUCCESSFULLY! 🎉");
      console.log("═══════════════════════════════════════════════════════════");
      console.log("");
      console.log("TRANSACTION DETAILS:");
      console.log(`  Block: ${receipt.blockNumber}`);
      console.log(`  Gas used: ${receipt.gasUsed?.toString()}`);
      console.log(`  Status: ✅ SUCCESS`);
      console.log("");
      console.log("VIEW ON ETHERSCAN:");
      console.log(
        `https://sepolia.etherscan.io/tx/${tx.hash}`
      );
      console.log("");
      console.log("═══════════════════════════════════════════════════════════");
    } else {
      console.log("");
      console.log("❌ TRANSACTION FAILED");
      console.log(`Status: ${receipt?.status}`);
    }
  } catch (error: any) {
    console.log("");
    console.log("❌ ERROR SUBMITTING TRANSACTION:");
    console.log("");
    if (error.reason) {
      console.log("Reason:", error.reason);
    } else if (error.message) {
      console.log("Message:", error.message);
    } else {
      console.log(JSON.stringify(error, null, 2));
    }
    console.log("");
    process.exit(1);
  }
}

main().catch(console.error);
