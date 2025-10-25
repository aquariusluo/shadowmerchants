/**
 * Diagnostic Page Component
 */
import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';

export const DiagnosticsPage: React.FC = () => {
  const { account, connected, chainId, provider, signer, shadowMerchantsContract } = useWeb3();
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setDiagnosticError(null);
    try {
      const info: any = {
        connected,
        account,
        chainId,
        hasProvider: !!provider,
        hasSigner: !!signer,
        hasContract: !!shadowMerchantsContract,
        contractAddress: shadowMerchantsContract?.address,
        contractTarget: shadowMerchantsContract?.target,
      };

      console.log('🔍 Full contract object:', shadowMerchantsContract);
      console.log('📍 Contract address:', shadowMerchantsContract?.address);
      console.log('📍 Contract target:', shadowMerchantsContract?.target);

      if (provider) {
        const network = await provider.getNetwork();
        info.network = {
          name: network.name,
          chainId: network.chainId.toString(),
        };

        // Get block number to verify provider connection
        const blockNumber = await provider.getBlockNumber();
        info.providerBlockNumber = blockNumber;
      }

      if (signer) {
        const signerAddress = await signer.getAddress();
        info.signerAddress = signerAddress;
      }

      if (shadowMerchantsContract) {
        console.log('Testing contract call...');
        console.log('Contract address being used:', shadowMerchantsContract.address || shadowMerchantsContract.target);

        try {
          // Try calling directly on the contract
          const gameInfo = await shadowMerchantsContract.getGameInfo();
          console.log('Raw response:', gameInfo);
          console.log('Response type:', typeof gameInfo);
          console.log('Response keys:', Object.keys(gameInfo));

          info.gameInfo = {
            currentRound: Number(gameInfo[0]),
            gameStartTime: Number(gameInfo[1]),
            lastRoundTime: Number(gameInfo[2]),
            playerCount: Number(gameInfo[3]),
            gameActive: gameInfo[4],
            gameEnded: gameInfo[5],
            winner: gameInfo[6],
          };
          info.rawGameInfo = gameInfo;
        } catch (contractErr: any) {
          console.error('Contract call error:', contractErr);
          info.gameInfoError = contractErr.message;
        }
      }

      setDiagnosticInfo(info);
    } catch (err: any) {
      setDiagnosticError(err.message);
      console.error('Diagnostic error:', err);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', margin: '20px 0' }}>
      <h3>Diagnostics</h3>
      <button
        onClick={runDiagnostics}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Run Diagnostics
      </button>

      {diagnosticError && (
        <div style={{ marginTop: '10px', color: 'red' }}>
          <strong>Error:</strong> {diagnosticError}
        </div>
      )}

      {diagnosticInfo && (
        <pre style={{ marginTop: '10px', backgroundColor: '#f4f4f4', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(diagnosticInfo, null, 2)}
        </pre>
      )}
    </div>
  );
};
