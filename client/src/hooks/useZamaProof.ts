import { useState, useCallback } from "react";
import { zamaGateway, EncryptedValue } from "../services/zamaGateway";

interface UseZamaProofState {
  loading: boolean;
  error: string | null;
  encryptedValue: EncryptedValue | null;
}

/**
 * Hook for generating Zama FHEVM proofs
 * Usage: const { generateProof, loading, error, encryptedValue } = useZamaProof();
 */
export const useZamaProof = () => {
  const [state, setState] = useState<UseZamaProofState>({
    loading: false,
    error: null,
    encryptedValue: null,
  });

  /**
   * Generate proof for a value (auction creation or bid)
   */
  const generateProof = useCallback(
    async (value: number | bigint, type: "reserve" | "bid" = "bid") => {
      setState({ loading: true, error: null, encryptedValue: null });

      try {
        let encrypted: EncryptedValue;

        if (type === "reserve") {
          encrypted = await zamaGateway.generateReservePriceProof(value);
        } else {
          encrypted = await zamaGateway.generateBidProof(value);
        }

        setState({
          loading: false,
          error: null,
          encryptedValue: encrypted,
        });

        return encrypted;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        setState({
          loading: false,
          error,
          encryptedValue: null,
        });
        throw err;
      }
    },
    []
  );

  /**
   * Generate proofs for multiple values
   */
  const generateBatchProofs = useCallback(
    async (values: (number | bigint)[]) => {
      setState({ loading: true, error: null, encryptedValue: null });

      try {
        const encrypted = await zamaGateway.encryptBatch(values);

        setState({
          loading: false,
          error: null,
          encryptedValue: encrypted[0] || null,
        });

        return encrypted;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        setState({
          loading: false,
          error,
          encryptedValue: null,
        });
        throw err;
      }
    },
    []
  );

  /**
   * Clear state
   */
  const clearProof = useCallback(() => {
    setState({
      loading: false,
      error: null,
      encryptedValue: null,
    });
  }, []);

  return {
    generateProof,
    generateBatchProofs,
    clearProof,
    loading: state.loading,
    error: state.error,
    encryptedValue: state.encryptedValue,
  };
};

export default useZamaProof;
