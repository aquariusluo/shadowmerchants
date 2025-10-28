/**
 * FHEVM Encryption Server (Step 1 of Zama Architecture)
 *
 * This server implements Step 1: User Encryption via Relayer (Off-Chain Preparation)
 *
 * It provides HTTP API for encrypting values using the official Zama Relayer SDK.
 * Encrypted values + ZK proofs are returned for submission to the Gateway (Step 2).
 *
 * Architecture Flow:
 * Step 1 (HERE): User → Relayer (Backend) → Encrypted bytes + ZK proofs
 * Step 2: Frontend → Gateway on Sepolia (transaction submission)
 * Step 3: Coprocessor → Off-chain FHE computation
 * Step 4: Gateway → Store encrypted result on Sepolia
 * Step 5: User → Relayer/KMS for decryption
 */

import express from "express";
import cors from "cors";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Global FHE instance
let fheInstance: any = null;
let initializationPromise: Promise<void> | null = null;

/**
 * MOCK MODE for Relayer outages
 * When Zama Relayer is down, we can test the full flow using plaintext mode
 * Set MOCK_MODE=true to use mock encryption (generates valid hex, empty proofs)
 * The contract will accept these in plaintext fallback mode
 * This allows testing: Gateway → Coprocessor → Results (Steps 2-5)
 *
 * Production: Disable MOCK_MODE to use REAL FHEVM encryption from Zama Relayer
 */
const MOCK_MODE = process.env.MOCK_MODE === "true" || false; // Disabled - Using REAL FHEVM
const MOCK_MODE_ENABLED_MSG =
  "ℹ️  Mock Mode Active: Using plaintext values for Relayer compatibility testing";

/**
 * Generate mock encrypted handle (32-byte hex string)
 * This simulates what the Relayer would return, but without actual FHE
 * Contract will treat this as plaintext when proof is empty
 */
function generateMockHandle(value: bigint): string {
  // Convert value to 32-byte hex (left-padded)
  const hex = value.toString(16).padStart(64, "0");
  return "0x" + hex;
}

/**
 * Initialize FHE instance (lazy initialization with singleton pattern)
 * Ensures only one initialization happens even with concurrent requests
 */
async function initializeFHE(): Promise<void> {
  // Return existing initialization if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Return immediately if already initialized
  if (fheInstance) {
    console.log("✅ FHE instance already initialized, reusing");
    return;
  }

  console.log("🔧 [Step 1: Relayer Initialization] Starting FHE instance setup...");

  initializationPromise = (async () => {
    try {
      console.log("📝 Using SepoliaConfig for Sepolia testnet");
      console.log("   - Gateway Contract: 0x7048C39f048125eDa9d678AEbaDfB22F7900a29F");
      console.log("   - Relayer Endpoint: https://relayer.testnet.zama.cloud");

      fheInstance = await createInstance(SepoliaConfig);

      console.log("✅ [Step 1 ✓] FHE instance initialized successfully");
      console.log("🌐 Connected to Zama Relayer Network");
      console.log("   Ready to encrypt user inputs for Gateway submission");
    } catch (error: any) {
      console.error("❌ [Step 1 ✗] Failed to initialize FHE");
      console.error("   Error:", error.message);

      // Detailed error diagnosis
      if (error.message.includes("backend connection")) {
        console.error("   → Zama Relayer service may be down (check https://status.zama.ai)");
      }

      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Convert Uint8Array to hex string
 */
function arrayToHex(arr: Uint8Array | number[]): string {
  const hexArray = Array.from(arr).map((b) =>
    b.toString(16).padStart(2, "0")
  );
  return "0x" + hexArray.join("");
}

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "FHEVM Encryption Server is running",
    port: PORT,
  });
});

/**
 * Encrypt uint64 endpoint (Step 1: Relayer Encryption)
 * POST /api/encrypt/uint64
 * Body: { value: string }
 *
 * In MOCK_MODE: Returns mock handles (plaintext as hex) + empty proofs
 * In REAL_MODE: Calls Zama Relayer for actual FHEVM encryption
 *
 * Contract accepts both:
 * - Mock: proof=0x → plaintext fallback mode
 * - Real: proof=0x01... → gateway verification mode
 */
app.post("/api/encrypt/uint64", async (req, res) => {
  try {
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({
        success: false,
        error: "value is required",
      });
    }

    // Validate value is a valid integer
    let numValue: bigint;
    try {
      numValue = BigInt(value);
      if (numValue < 0n) throw new Error("Value must be non-negative");
    } catch {
      return res.status(400).json({
        success: false,
        error: "value must be a valid non-negative integer",
      });
    }

    console.log(`\n🔐 [Step 1: Encryption] Encrypting uint64 value: ${value}`);

    // ============ MOCK MODE (Relayer Down) ============
    if (MOCK_MODE) {
      console.log(`${MOCK_MODE_ENABLED_MSG}`);
      console.log("   Using plaintext workaround for Gateway testing");

      const mockHandle = generateMockHandle(numValue);
      const mockProof = "0x"; // Empty proof triggers plaintext mode in contract

      console.log("✅ [Step 1 ✓] Mock encryption successful (plaintext mode)");
      console.log(`   Handle: ${mockHandle.substring(0, 20)}...`);
      console.log("   Proof:  0x (empty - plaintext fallback)");
      console.log("   → Ready for Step 2: Gateway submission\n");

      return res.json({
        success: true,
        mode: "MOCK (Plaintext Fallback)",
        step: "Step 1: User Encryption via Relayer",
        handle: mockHandle,
        proof: mockProof,
        originalValue: value,
        contractMode: "usesPlaintext=true",
        note: "Contract will treat handle as plaintext uint64. Perfect for testing Steps 2-5!",
        nextStep: "Submit to Gateway contract with these values",
      });
    }

    // ============ REAL MODE (Relayer Available) ============
    console.log("   Attempting real FHEVM encryption via Zama Relayer...");

    // Initialize FHE if needed (lazy init)
    await initializeFHE();

    // Create encrypted input for the Gateway contract
    const encryptedInput = fheInstance
      .createEncryptedInput(
        "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F", // Gateway contract
        "0x0000000000000000000000000000000000000000"   // Placeholder user
      )
      .add64(numValue);

    console.log("   Generating ZK proof via Relayer...");

    // Encrypt - generates ciphertext + ZK proof via Relayer
    const encrypted = await encryptedInput.encrypt();

    console.log("✅ [Step 1 ✓] Real FHEVM encryption successful");

    const handleHex = arrayToHex(encrypted.handles[0]);
    const proofHex = arrayToHex(encrypted.inputProof);

    console.log(`   Handle: ${handleHex.substring(0, 20)}...`);
    console.log(`   Proof:  ${proofHex.substring(0, 20)}...`);
    console.log("   → Ready for Step 2: Gateway submission\n");

    res.json({
      success: true,
      mode: "REAL (FHEVM Encrypted)",
      step: "Step 1: User Encryption via Relayer",
      handle: handleHex,
      proof: proofHex,
      originalValue: value,
      contractMode: "gateway verification",
      nextStep: "Submit to Gateway contract with these encrypted values",
    });
  } catch (error: any) {
    console.error("❌ [Step 1 ✗] Encryption failed");
    console.error("   Error:", error.message);

    // Provide detailed error context
    const errorResponse: any = {
      success: false,
      error: error.message || "Encryption failed",
      step: "Step 1: User Encryption via Relayer",
      troubleshooting: {},
      suggestion: "Relayer may be down. Try MOCK_MODE=true for plaintext testing",
    };

    if (error.message?.includes("backend connection")) {
      errorResponse.troubleshooting.issue = "Zama Relayer service connection failed";
      errorResponse.troubleshooting.suggestion =
        "Check https://status.zama.ai - Relayer service is likely down";
      errorResponse.workaround =
        "Use MOCK_MODE for plaintext fallback testing (set MOCK_MODE=true env var)";
    } else if (error.message?.includes("RELAYER_FETCH_ERROR")) {
      errorResponse.troubleshooting.issue = "Relayer API returned an error";
      errorResponse.troubleshooting.suggestion = "Retry in a few moments";
    }

    res.status(500).json(errorResponse);
  }
});

/**
 * Batch encrypt endpoint
 * POST /api/encrypt/batch
 * Body: { values: string[] }
 */
app.post("/api/encrypt/batch", async (req, res) => {
  try {
    const { values } = req.body;

    if (!Array.isArray(values)) {
      return res.status(400).json({ error: "values must be an array" });
    }

    console.log(`🔐 Encrypting ${values.length} values`);

    await initializeFHE();

    const results = [];

    for (const value of values) {
      const bigintValue = BigInt(value);

      const encryptedInput = fheInstance
        .createEncryptedInput(
          "0xdcac98a77A522e175701D756F4d3387674089343",
          "0x0000000000000000000000000000000000000000"
        )
        .add64(bigintValue);

      const encrypted = await encryptedInput.encrypt();

      results.push({
        originalValue: value,
        handle: arrayToHex(encrypted.handles[0]),
        proof: arrayToHex(encrypted.inputProof),
      });
    }

    console.log(`✅ Successfully encrypted ${results.length} values`);

    res.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error("❌ Batch encryption error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Batch encryption failed",
    });
  }
});

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`🚀 FHEVM Encryption Server running on http://localhost:${PORT}`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("Available endpoints:");
  console.log(`  POST http://localhost:${PORT}/api/encrypt/uint64`);
  console.log(`  POST http://localhost:${PORT}/api/encrypt/batch`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log("");
});
