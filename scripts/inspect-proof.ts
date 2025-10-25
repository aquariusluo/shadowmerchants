/**
 * Detailed proof inspection script
 * Usage: npx ts-node scripts/inspect-proof.ts
 */

import ZamaGatewayService from "../client/src/services/zamaGateway";

async function main() {
  const gateway = new ZamaGatewayService();

  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║           DETAILED PROOF INSPECTION                       ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");

  const result = await gateway.encryptUint64(500);

  const handleHex = result.handleHex || "";
  const proofHex = result.proofHex || "";

  console.log("🔍 HANDLE DETAILS:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Type:", typeof handleHex);
  console.log("Length (chars):", handleHex.length);
  console.log("Length (bytes):", Math.floor(handleHex.length / 2) - 1);
  console.log("First 20 chars:", handleHex.substring(0, 20));
  console.log("Last 20 chars:", handleHex.substring(handleHex.length - 20));
  console.log("Full value:");
  console.log(handleHex);
  console.log("");

  console.log("🔍 PROOF DETAILS:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Type:", typeof proofHex);
  console.log("Length (chars):", proofHex.length);
  console.log("Length (bytes):", Math.floor(proofHex.length / 2) - 1);
  console.log("First 20 chars:", proofHex.substring(0, 20));
  console.log("Last 20 chars:", proofHex.substring(proofHex.length - 20));
  console.log("Full value:");
  console.log(proofHex);
  console.log("");

  // Calculate realistic gas
  const callDataBytes = handleHex.length / 2 + proofHex.length / 2;
  const callDataGas = callDataBytes * 16;
  const totalGasEstimate = 21000 + callDataGas;

  console.log("📊 GAS CALCULATION:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Handle bytes:", handleHex.length / 2);
  console.log("Proof bytes:", proofHex.length / 2);
  console.log("Total calldata bytes:", callDataBytes);
  console.log("Gas per byte (16):", callDataGas);
  console.log("Base gas (21000):", 21000);
  console.log("Calldata total:", totalGasEstimate);
  console.log("Contract execution ~200k:", 200000);
  console.log("EXPECTED TOTAL:", totalGasEstimate + 200000);
  console.log("");

  if (totalGasEstimate > 16777216) {
    console.log("❌ ERROR: Calldata alone exceeds transaction limit!");
    console.log("This should never happen with Zama proofs!");
  } else {
    console.log("✅ Calldata is reasonable");
  }

  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║              READY TO PASTE TO ETHERSCAN                  ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("goodType:        5");
  console.log("reservePrice:    " + handleHex);
  console.log("proof:           " + proofHex);
  console.log("durationSeconds: 360");
  console.log("");
}

main().catch(console.error);
