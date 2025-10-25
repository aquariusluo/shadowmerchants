/**
 * Zama Gateway API Service
 * Calls local Node.js backend API for FHEVM encryption using real fhevmjs SDK
 */

export interface ProofResponse {
  data: string; // Encrypted value handle (bytes32)
  proof: string; // ZK proof (bytes)
}

export interface EncryptedValue {
  handle: string; // euint64 handle for encrypted value
  proof: string; // ZK proof
  originalValue: bigint; // For reference only
  handleHex?: string; // Hex format for Etherscan (0x...)
  proofHex?: string; // Hex format for Etherscan (0x...)
}

class ZamaGatewayService {
  // Local backend server endpoint
  private backendUrl = "http://localhost:4000";

  constructor() {
    // Backend configuration is set
  }

  /**
   * Call local backend to encrypt a value using real fhevmjs SDK
   */
  async encryptUint64(value: number | bigint): Promise<EncryptedValue> {
    try {
      console.log(`🔐 Encrypting uint64 value via backend: ${value}`);

      const bigintValue = BigInt(value);

      // Call local backend API
      const response = await fetch(`${this.backendUrl}/api/encrypt/uint64`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: bigintValue.toString(),
        }),
      });

      if (!response.ok) {
        console.warn(
          `⚠️ Backend returned ${response.status}: ${response.statusText}`
        );
        throw new Error(
          `Backend error: ${response.status} ${response.statusText}`
        );
      }

      const encrypted = await response.json();

      if (!encrypted.success) {
        throw new Error(encrypted.error || "Encryption failed");
      }

      console.log("✅ Encryption via backend successful");
      console.log("🔐 Real FHEVM encrypted handle:", encrypted.handle);
      console.log("📋 Real FHEVM ZK proof:", encrypted.proof);

      return {
        handle: encrypted.handle || "",
        proof: encrypted.proof || "",
        originalValue: bigintValue,
        handleHex: encrypted.handle || "",
        proofHex: encrypted.proof || "",
      };
    } catch (error) {
      console.error("❌ Encryption via backend failed:", error);

      // Log detailed error info
      if (error instanceof TypeError) {
        console.error(
          "❌ Cannot connect to backend at http://localhost:4000"
        );
        console.error("   Make sure to run: npm run server");
      }

      // Do NOT fallback to plaintext - fail explicitly
      throw error;
    }
  }

  /**
   * Batch encrypt multiple values
   */
  async encryptBatch(
    values: (number | bigint)[]
  ): Promise<EncryptedValue[]> {
    console.log(`🔐 Encrypting ${values.length} values...`);

    const response = await fetch(`${this.backendUrl}/api/encrypt/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: values.map((v) => BigInt(v).toString()),
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Batch encryption failed");
    }

    const results = data.results.map(
      (r: any) =>
        ({
          handle: r.handle,
          proof: r.proof,
          originalValue: BigInt(r.originalValue),
          handleHex: r.handle,
          proofHex: r.proof,
        } as EncryptedValue)
    );

    console.log(`✅ Encrypted ${results.length} values`);
    return results;
  }

  /**
   * Generate proof for auction creation (reserve price)
   */
  async generateReservePriceProof(
    reservePrice: number | bigint
  ): Promise<EncryptedValue> {
    console.log(`📊 Generating reserve price proof for: ${reservePrice}`);
    return this.encryptUint64(reservePrice);
  }

  /**
   * Generate proof for bid placement
   */
  async generateBidProof(bidAmount: number | bigint): Promise<EncryptedValue> {
    console.log(`💰 Generating bid proof for amount: ${bidAmount}`);
    return this.encryptUint64(bidAmount);
  }

  /**
   * Check if backend is available
   */
  async isGatewayAvailable(): Promise<boolean> {
    try {
      console.log("🔍 Checking backend availability...");
      const response = await fetch(`${this.backendUrl}/health`, {
        method: "GET",
      });
      const available = response.ok;
      console.log(
        available ? "✅ Backend available" : "⚠️ Backend unavailable"
      );
      return available;
    } catch (error) {
      console.warn("⚠️ Backend not available:", error);
      return false;
    }
  }

  /**
   * Get backend status and info
   */
  async getGatewayInfo(): Promise<any> {
    try {
      const available = await this.isGatewayAvailable();
      return {
        status: available ? "ready" : "unavailable",
        sdk: "Local Backend with Real Zama fhevmjs SDK",
        backend: this.backendUrl,
        version: "1.0",
      };
    } catch (error) {
      console.error("Failed to get backend info:", error);
      return null;
    }
  }

  /**
   * Encrypt value and display formatted output for Etherscan Write Contract
   * @param value - The plaintext value to encrypt
   * @param description - Description of what is being encrypted
   * @returns EncryptedValue with hex formatting
   */
  async encryptForEtherscan(
    value: number | bigint,
    description: string = "Value"
  ): Promise<EncryptedValue> {
    console.log("");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`🔐 ENCRYPTING FOR ETHERSCAN: ${description}`);
    console.log("═══════════════════════════════════════════════════════════");
    console.log("");

    const encrypted = await this.encryptUint64(value);

    console.log("");
    console.log("📋 COPY THESE VALUES TO ETHERSCAN:");
    console.log("");
    console.log("Field: reservePrice or bidAmount (bytes32)");
    console.log("─────────────────────────────────────────────────────────────");
    console.log(encrypted.handleHex);
    console.log("");
    console.log("Field: proof (bytes)");
    console.log("─────────────────────────────────────────────────────────────");
    console.log(encrypted.proofHex);
    console.log("");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("");

    return encrypted;
  }
}

// Export singleton instance
export const zamaGateway = new ZamaGatewayService();

export default ZamaGatewayService;
