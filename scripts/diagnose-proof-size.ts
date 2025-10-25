/**
 * Diagnose proof size and format issues
 * Usage: npx ts-node scripts/diagnose-proof-size.ts
 */

import ZamaGatewayService from "../client/src/services/zamaGateway";

async function main() {
  const gateway = new ZamaGatewayService();

  console.log("");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           PROOF SIZE AND FORMAT DIAGNOSTIC                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");

  // Encrypt a value
  const result = await gateway.encryptUint64(500);

  console.log("📊 ANALYSIS:");
  console.log("");

  // Handle analysis
  const handleHex = result.handleHex || "";
  const proofHex = result.proofHex || "";

  console.log("HANDLE (bytes32 - Reserved Price):");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Format:", typeof handleHex);
  console.log("Value:", handleHex);
  console.log("Length (characters):", handleHex.length);
  console.log("Length (bytes):", handleHex.length / 2 - 1); // -1 for 0x
  console.log("Size in KB:", ((handleHex.length / 2) / 1024).toFixed(3));
  console.log("");

  // Proof analysis
  console.log("PROOF (bytes - ZK Proof):");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Format:", typeof proofHex);
  console.log("Value length (characters):", proofHex.length);
  console.log("Length (bytes):", proofHex.length / 2 - 1); // -1 for 0x
  console.log("Size in KB:", ((proofHex.length / 2) / 1024).toFixed(3));
  console.log("");

  // Total transaction size estimate
  const totalBytes = (handleHex.length / 2) + (proofHex.length / 2);
  const gasPerByte = 16; // Approximate gas per byte for calldata
  const estimatedGas = 21000 + (totalBytes * gasPerByte); // 21000 base + calldata gas

  console.log("📈 GAS ESTIMATION:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Base transaction gas: 21000");
  console.log("Calldata bytes:", totalBytes);
  console.log("Gas per calldata byte: ~16");
  console.log("Estimated calldata gas:", totalBytes * gasPerByte);
  console.log("Estimated total gas:", estimatedGas.toLocaleString());
  console.log("");

  if (estimatedGas > 300000) {
    console.log("⚠️  WARNING: Estimated gas is very high!");
    console.log("Normal FHEVM createAuction should be 250k-400k");
  } else {
    console.log("✅ Estimated gas is reasonable");
  }

  console.log("");
  console.log("🔍 VERIFICATION CHECKLIST:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(
    `✅ Handle is 32 bytes (64 hex chars): ${handleHex.length === 66 ? "YES" : "NO"}`
  );
  console.log(`✅ Handle starts with 0x: ${handleHex.startsWith("0x") ? "YES" : "NO"}`);
  console.log(`✅ Proof starts with 0x: ${proofHex.startsWith("0x") ? "YES" : "NO"}`);
  console.log(`✅ Proof is hex format: ${/^0x[0-9a-f]+$/i.test(proofHex) ? "YES" : "NO"}`);

  console.log("");
  console.log("═════════════════════════════════════════════════════════════");
  console.log("");

  // If there's an issue, provide guidance
  if (estimatedGas > 16777216) {
    console.log("❌ ERROR: Proof size creates transaction exceeding gas limit!");
    console.log("");
    console.log("This might be caused by:");
    console.log("1. Proof data being included multiple times");
    console.log("2. Extra whitespace or formatting in the data");
    console.log("3. Zama SDK version issue");
    console.log("");
    console.log("Solution: Check your proof value on Etherscan");
    console.log("It should be just hex characters, no spaces or newlines");
  }
}

main().catch(console.error);
