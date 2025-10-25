/**
 * Submit createAuction transaction directly using ethers.js
 * Usage: npx ts-node scripts/submit-auction.ts
 */

import { ethers } from "ethers";
import ZamaGatewayService from "../client/src/services/zamaGateway";

// Contract ABI (minimal for createAuction)
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
  console.log("║   SUBMIT createAuction TRANSACTION VIA ETHERS.JS          ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");

  // Step 1: Generate encrypted proof
  console.log("STEP 1: Generating encrypted reserve price...");
  console.log("");
  const gateway = new ZamaGatewayService();
  const encryptedReserve = await gateway.encryptUint64(500);

  const goodType = 8; // 1-255
  const reservePriceHex = encryptedReserve.handleHex || "";
  const proofHex = encryptedReserve.proofHex || "";
  const durationSeconds = 360;

  console.log("✅ Encryption complete");
  console.log("");
  console.log("PARAMETERS:");
  console.log(`  goodType: ${goodType}`);
  console.log(`  reservePrice: ${reservePriceHex}`);
  console.log(`  proof: ${proofHex.substring(0, 50)}...`);
  console.log(`  durationSeconds: ${durationSeconds}`);
  console.log("");

  // Step 2: Connect to wallet
  console.log("STEP 2: Connecting to MetaMask...");
  console.log("");

  // Request accounts from MetaMask
  if (typeof window === "undefined" && !process.env.PRIVATE_KEY) {
    console.log("❌ ERROR: Not in browser and no PRIVATE_KEY in .env");
    console.log("");
    console.log("Options:");
    console.log("1. Run this in browser console with MetaMask injected");
    console.log("2. Set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  let signer;

  // Try to use MetaMask if available (browser environment)
  if (typeof window !== "undefined" && window.ethereum) {
    console.log("Using MetaMask from browser...");
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
  } else if (process.env.PRIVATE_KEY) {
    // Use private key from .env (for Node.js environment)
    console.log("Using PRIVATE_KEY from .env...");
    const provider = new ethers.JsonRpcProvider(
      process.env.VITE_RPC_URL || "https://eth-sepolia.public.blastapi.io"
    );
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  } else {
    console.log("❌ ERROR: Cannot connect to wallet");
    process.exit(1);
  }

  const address = await signer.getAddress();
  console.log(`✅ Connected to: ${address}`);
  console.log("");

  // Step 3: Create contract interface
  console.log("STEP 3: Preparing transaction...");
  console.log("");

  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  try {
    // Step 4: Estimate gas
    console.log("Estimating gas...");
    const gasEstimate = await contract.createAuction.estimateGas(
      goodType,
      reservePriceHex,
      proofHex,
      durationSeconds
    );

    console.log(`✅ Gas estimate: ${gasEstimate.toString()}`);
    console.log(`✅ With 20% buffer: ${(gasEstimate * 1.2n).toString()}`);
    console.log("");

    // Step 5: Submit transaction
    console.log("STEP 4: Submitting transaction to Sepolia...");
    console.log("");

    const tx = await contract.createAuction(
      goodType,
      reservePriceHex,
      proofHex,
      durationSeconds,
      {
        gasLimit: (gasEstimate * 120n) / 100n, // 20% buffer
      }
    );

    console.log(`✅ Transaction submitted!`);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("");
    console.log("Waiting for confirmation...");
    console.log("");

    // Step 6: Wait for confirmation
    const receipt = await tx.wait();

    if (receipt?.blockNumber) {
      console.log("✅ TRANSACTION CONFIRMED!");
      console.log("");
      console.log("DETAILS:");
      console.log(`  Block: ${receipt.blockNumber}`);
      console.log(`  Gas used: ${receipt.gasUsed?.toString()}`);
      console.log(`  Status: ${receipt.status === 1 ? "SUCCESS ✅" : "FAILED ❌"}`);
      console.log("");
      console.log(`View on Etherscan:`);
      console.log(
        `https://sepolia.etherscan.io/tx/${tx.hash}`
      );
      console.log("");
      console.log("═══════════════════════════════════════════════════════════");
      console.log("🎉 AUCTION CREATED SUCCESSFULLY!");
      console.log("═══════════════════════════════════════════════════════════");
    }
  } catch (error: any) {
    console.log("");
    console.log("❌ ERROR:");
    console.log("");
    if (error.reason) {
      console.log("Reason:", error.reason);
    } else if (error.message) {
      console.log("Message:", error.message);
    } else {
      console.log(error);
    }
    console.log("");
    process.exit(1);
  }
}

main().catch(console.error);
