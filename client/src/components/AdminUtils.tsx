/**
 * Admin Utilities - Grant Roles to Wallets
 * Allows admin to grant AUCTION_MANAGER_ROLE to any wallet
 */
import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';

export const AdminUtils: React.FC = () => {
  const { marketAuctionContract, account, connected } = useWeb3();
  const [targetAddress, setTargetAddress] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGrantRole = async () => {
    if (!targetAddress || !marketAuctionContract) {
      setError('Please enter a valid wallet address');
      return;
    }

    try {
      setGrantLoading(true);
      setError(null);
      setSuccess(null);

      console.log('🔐 Granting AUCTION_MANAGER_ROLE to:', targetAddress);

      // Get the AUCTION_MANAGER_ROLE bytes32 hash
      // keccak256("AUCTION_MANAGER_ROLE") = 0x9f2df0fed2c77648de5860a4cc508558e33a9d82e445962194dc247e742a0095
      const AUCTION_MANAGER_ROLE = '0x9f2df0fed2c77648de5860a4cc508558e33a9d82e445962194dc247e742a0095';

      // Call grantRole(role, account)
      const tx = await marketAuctionContract.grantRole(AUCTION_MANAGER_ROLE, targetAddress);
      console.log('✅ Grant role tx sent:', tx.hash);

      await tx.wait();
      console.log('✅ Role granted successfully!');

      setSuccess(`✅ AUCTION_MANAGER_ROLE granted to ${targetAddress}`);
      setTargetAddress('');
    } catch (err: any) {
      console.error('❌ Error granting role:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setGrantLoading(false);
    }
  };

  if (!connected) {
    return null;
  }

  return (
    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f0f0f0' }}>
      <h3 style={{ marginTop: 0 }}>🔑 Grant Auction Manager Role</h3>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '13px' }}>
          Wallet Address:
        </label>
        <input
          type="text"
          placeholder="0x..."
          value={targetAddress}
          onChange={(e) => setTargetAddress(e.target.value)}
          disabled={grantLoading}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '13px',
            boxSizing: 'border-box',
            opacity: grantLoading ? 0.6 : 1,
          }}
        />
        <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
          Enter the wallet address that should be able to create auctions
        </small>
      </div>

      <button
        onClick={handleGrantRole}
        disabled={grantLoading || !targetAddress}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: grantLoading || !targetAddress ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: grantLoading || !targetAddress ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
        }}
      >
        {grantLoading ? '⏳ Granting Role...' : '✨ Grant Role'}
      </button>

      {error && (
        <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '4px', fontSize: '13px' }}>
          ✅ {success}
        </div>
      )}

      <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '12px', color: '#1565c0' }}>
        <strong>How to use:</strong>
        <ol style={{ margin: '6px 0', paddingLeft: '18px' }}>
          <li>Make sure you're connected with the <strong>deployer account</strong> (the one that deployed the contracts)</li>
          <li>Paste your wallet address above</li>
          <li>Click "Grant Role"</li>
          <li>Confirm the transaction in MetaMask</li>
          <li>After confirmation, you can create auctions!</li>
        </ol>
      </div>
    </div>
  );
};
