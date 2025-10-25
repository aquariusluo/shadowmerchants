/**
 * Enhanced encryption script that outputs hex format ready for Etherscan
 * Usage: npx ts-node scripts/encrypt-for-etherscan.ts
 */

import ZamaGatewayService from "../client/src/services/zamaGateway";

async function main() {
  const gateway = new ZamaGatewayService();

  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║      ZAMA FHEVM ENCRYPTION FOR ETHERSCAN WRITE CONTRACT   ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");

  // Encrypt reserve price
  console.log("STEP 1: Encrypting Reserve Price");
  console.log("─────────────────────────────────────────────────────────────");
  const reserveResult = await gateway.encryptForEtherscan(500, "Reserve Price");

  // Encrypt bid amount
  console.log("");
  console.log("STEP 2: Encrypting Bid Amount");
  console.log("─────────────────────────────────────────────────────────────");
  const bidResult = await gateway.encryptForEtherscan(600, "Bid Amount");

  // Summary
  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║                    ETHERSCAN SUBMISSION                   ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");

  console.log("📝 FOR createAuction():");
  console.log("");
  console.log("goodType: 5");
  console.log("reservePrice: " + reserveResult.handleHex);
  console.log("proof: " + reserveResult.proofHex);
  console.log("durationSeconds: 360");
  console.log("");

  console.log("────────────────────────────────────────────────────────────");
  console.log("");

  console.log("📝 FOR placeBid():");
  console.log("");
  console.log("auctionId: 1");
  console.log("bidAmount: " + bidResult.handleHex);
  console.log("proof: " + bidResult.proofHex);
  console.log("");

  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ Ready to copy to Etherscan!");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
}

main().catch(console.error);
