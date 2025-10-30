import { useState, useCallback } from 'react';
import { BrowserProvider } from 'ethers';

/**
 * Hook to manage FHEVM encryption following Zama's 5-Step Architecture
 *
 * Step 1 (Backend): Relayer encrypts user inputs → handle + ZK proof
 * Step 2 (Frontend): Submit encrypted values to Gateway contract
 * Step 3 (Offchain): Coprocessor performs FHE computations
 * Step 4 (Contract): Gateway stores encrypted results
 * Step 5 (Backend): User decrypts via Relayer/KMS
 *
 * This hook manages Step 1: calling backend Relayer API for encryption
 */

interface FHEInstance {
  encrypt64: (value: number | bigint) => Promise<any>;
  createEncryptedInput: (contractAddress: string, userAddress: string) => any;
}

interface EncryptionResult {
  handle: string;
  proof: string;
  originalValue: string;
}

export const useFHEEncryption = () => {
  const [instance, setInstance] = useState<FHEInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  /**
   * Initialize FHE encryption service
   * Calls backend server which connects to Zama Relayer
   */
  const initializeFHE = useCallback(async (provider: BrowserProvider, chainId: number) => {
    // Only initialize once
    if (initialized) {
      console.log('🔐 [FHE Hook] Already initialized, skipping...');
      return;
    }

    console.log('🔐 [FHE Hook] Starting FHE initialization...');
    console.log('   Backend: /api (proxied by Vite dev server)');
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 [FHE Hook] Connecting to backend Relayer server...');

      // Create proxy instance that calls backend server
      const proxyInstance: FHEInstance = {
        encrypt64: async (value: number | bigint) => {
          console.log('🔐 [FHE Hook] Encrypting uint64:', value);
          const encrypted = await encryptViaBackend(value);
          return encrypted;
        },
        createEncryptedInput: (contractAddress: string, userAddress: string) => {
          console.log('🔐 [FHE Hook] Creating encrypted input builder', {
            contract: contractAddress,
            user: userAddress,
          });

          const inputs: any[] = [];

          return {
            add64: (val: number) => {
              inputs.push({ type: 'uint64', value: val });
              return this;
            },
            add16: (val: number) => {
              inputs.push({ type: 'uint16', value: val });
              return this;
            },
            add8: (val: number) => {
              inputs.push({ type: 'uint8', value: val });
              return this;
            },
            encrypt: async () => {
              console.log('🔐 [FHE Hook] Encrypting', inputs.length, 'values via backend Relayer...');
              const handles: string[] = [];
              const proofs: string[] = [];

              for (const inp of inputs) {
                const encrypted = await encryptViaBackend(inp.value);
                handles.push(encrypted.handle);
                proofs.push(encrypted.proof);
              }

              // Return first handle/proof for single value, or combined for multiple
              if (inputs.length === 1) {
                return {
                  handles: [handles[0]],
                  inputProof: proofs[0],
                };
              } else {
                return {
                  handles: handles,
                  inputProof: proofs[0], // Or combine proofs if needed
                };
              }
            },
          };
        },
      };

      console.log('✅ [FHE Hook] Backend Relayer connection ready');
      setInstance(proxyInstance);
      setInitialized(true);
      setIsLoading(false);
      return;
    } catch (err: any) {
      console.error('❌ [FHE Hook] Initialization error:', err.message);
      setError(err.message || 'Failed to initialize FHE');
      setIsLoading(false);
    }
  }, [initialized]);

  /**
   * Call backend Relayer API for Step 1 encryption
   * Sends plaintext → gets ciphertext + ZK proof
   */
  const encryptViaBackend = async (value: number | bigint): Promise<EncryptionResult> => {
    try {
      // Use relative URL so Vite proxy can forward to backend
      // In dev: Vite proxies /api/* to http://localhost:4000
      // In prod: nginx/proxy handles routing
      const response = await fetch('/api/encrypt/uint64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: value.toString() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Encryption failed');
      }

      console.log('✅ [Relayer] Step 1 encryption successful');
      console.log('   Handle received:', data.handle.substring(0, 20) + '...');
      console.log('   Proof received:', data.proof.substring(0, 20) + '...');

      return {
        handle: data.handle,
        proof: data.proof,
        originalValue: data.originalValue,
      };
    } catch (err: any) {
      console.error('❌ [Relayer] Encryption error:', err.message);
      throw err;
    }
  };

  /**
   * Encrypt starting resources for game initialization
   * Returns encrypted gold, reputation, energy + proofs
   */
  const encryptStartingResources = async (
    gold: number,
    reputation: number,
    energy: number,
    contractAddress: string,
    userAddress: string
  ) => {
    if (!instance) {
      throw new Error('FHE instance not initialized');
    }

    try {
      console.log('🔐 [FHE Hook] Encrypting starting resources via Relayer...');

      // Encrypt each resource value
      const goldEncrypted = await encryptViaBackend(gold);
      const reputationEncrypted = await encryptViaBackend(reputation);
      const energyEncrypted = await encryptViaBackend(energy);

      console.log('✅ [FHE Hook] All resources encrypted');

      return {
        encryptedGold: goldEncrypted.handle,
        goldProof: goldEncrypted.proof,
        encryptedReputation: reputationEncrypted.handle,
        reputationProof: reputationEncrypted.proof,
        encryptedEnergy: energyEncrypted.handle,
        energyProof: energyEncrypted.proof,
      };
    } catch (err: any) {
      console.error('❌ [FHE Hook] Resource encryption failed:', err);
      throw new Error(`Encryption failed: ${err.message}`);
    }
  };

  return {
    instance,
    isLoading,
    error,
    initializeFHE,
    encryptStartingResources,
  };
};

