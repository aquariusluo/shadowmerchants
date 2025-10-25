/**
 * MetaMask Connect Button Component
 */
import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';

export const ConnectButton: React.FC = () => {
  const { account, connected, connectWallet, disconnectWallet, loading, error } = useWeb3();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWallet();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {error && <span style={{ color: 'red', fontSize: '12px' }}>{error}</span>}
      {connected && account ? (
        <>
          <span style={{ fontSize: '14px', color: '#666' }}>
            Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </span>
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isDisconnecting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isDisconnecting ? 0.6 : 1,
            }}
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </>
      ) : (
        <button
          onClick={connectWallet}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Connecting...' : 'Connect MetaMask'}
        </button>
      )}
    </div>
  );
};
