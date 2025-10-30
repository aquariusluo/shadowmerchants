/**
 * Web3 Context and MetaMask Provider
 */
import React, { useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';

// Import ABIs from local TypeScript file
import { SHADOW_MERCHANTS_ABI, MARKET_AUCTION_ABI } from '../abi';
import { Web3Context, Web3ContextType } from './Web3Context.types';

export const Web3Provider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [shadowMerchantsContract, setShadowMerchantsContract] = useState<Contract | null>(null);
  const [marketAuctionContract, setMarketAuctionContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask to use this app.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const selectedAccount = accounts[0];
      setAccount(selectedAccount);

      // Create provider and signer
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const ethersSigner = await ethersProvider.getSigner();

      setProvider(ethersProvider);
      setSigner(ethersSigner);

      // Get current chain
      const network = await ethersProvider.getNetwork();
      setChainId(Number(network.chainId));

      // Check if on Zama Testnet (chainId 9000) or Sepolia (chainId 11155111)
      const zama_chain_id = 9000; // Zama testnet default
      const sepolia_chain_id = 11155111;
      const expected_chain_id = parseInt(import.meta.env.VITE_CHAIN_ID || '9000', 10);

      console.log('🔗 Chain Check:', {
        currentChainId: Number(network.chainId),
        expectedChainId: expected_chain_id,
        networkName: network.name,
      });

      if (Number(network.chainId) !== expected_chain_id) {
        // Try to switch to expected chain
        try {
          const chainIdHex = '0x' + expected_chain_id.toString(16);
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
          });
          console.log('✅ Switched to chain:', expected_chain_id);
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Chain not added to MetaMask
            console.log('⚠️ Chain not in MetaMask. Please add it manually:');
            if (expected_chain_id === zama_chain_id) {
              console.log('  - Network: Zama Testnet');
              console.log('  - RPC URL:', import.meta.env.VITE_RPC_URL);
              console.log('  - Chain ID:', expected_chain_id);
            } else if (expected_chain_id === sepolia_chain_id) {
              console.log('  - Network: Ethereum Sepolia');
              console.log('  - RPC URL: https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY');
              console.log('  - Chain ID:', expected_chain_id);
            }
          }
        }
      }

      // Initialize contracts
      const shadowMerchantsAddress = import.meta.env.VITE_SHADOW_MERCHANTS_ADDRESS;
      const marketAuctionAddress = import.meta.env.VITE_MARKET_AUCTION_ADDRESS;
      const rpcUrl = import.meta.env.VITE_RPC_URL;

      // Comprehensive network and provider diagnostics
      const signerAddress = await ethersSigner.getAddress();
      const networkInfo = await ethersProvider.getNetwork();

      console.log('🔍 Env Variables:', {
        shadowAddress: shadowMerchantsAddress,
        shadowAddressType: typeof shadowMerchantsAddress,
        shadowAddressLength: shadowMerchantsAddress?.length,
        auctionAddress: marketAuctionAddress,
        rpcUrl: rpcUrl,
      });

      console.log('🌐 Network Diagnostics:', {
        chainId: networkInfo.chainId,
        chainName: networkInfo.name,
        expectedChainId: 11155111,
        isCorrectChain: networkInfo.chainId === 11155111n,
      });

      console.log('👤 Signer Diagnostics:', {
        signerAddress,
        rpcUrl: rpcUrl,
      });

      if (shadowMerchantsAddress) {
        console.log('✅ Contract address is set:', shadowMerchantsAddress);

        // For read-only calls, use provider directly
        // For write calls, use signer
        // Create contract with signer for write operations
        const shadowContractWithSigner = new ethers.Contract(
          shadowMerchantsAddress,
          SHADOW_MERCHANTS_ABI,
          ethersSigner
        );

        // Also create with provider for read-only calls (more reliable)
        const shadowContractWithProvider = new ethers.Contract(
          shadowMerchantsAddress,
          SHADOW_MERCHANTS_ABI,
          ethersProvider
        );

        console.log('📝 Contract created with signer for write operations');
        console.log('📝 Contract created with provider for read operations');

        // Test the contract call with provider (read-only calls)
        try {
          console.log('🔧 Testing contract call with provider (read-only)...');
          const testCall = await shadowContractWithProvider.getGameInfo();
          console.log('✅ Test call succeeded:', {
            currentRound: Number(testCall[0]),
            gameActive: testCall[4],
            playerCount: Number(testCall[3]),
          });
        } catch (testErr: any) {
          console.error('❌ Test call with provider failed:', testErr.message);
        }

        // Use contract with signer (which can fallback to provider for reads)
        setShadowMerchantsContract(shadowContractWithSigner);
        console.log('✅ ShadowMerchants contract initialized:', shadowMerchantsAddress);
      } else {
        console.error('❌ VITE_SHADOW_MERCHANTS_ADDRESS not set');
      }

      if (marketAuctionAddress) {
        const marketContractWithSigner = new ethers.Contract(
          marketAuctionAddress,
          MARKET_AUCTION_ABI,
          ethersSigner
        );
        setMarketAuctionContract(marketContractWithSigner);
        console.log('✅ MarketAuction contract initialized:', marketAuctionAddress);
      } else {
        console.error('❌ VITE_MARKET_AUCTION_ADDRESS not set');
      }

      setConnected(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      // Revoke MetaMask permissions so user needs to re-authorize
      if (window.ethereum && window.ethereum.request) {
        try {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [
              {
                eth_accounts: {},
              },
            ],
          });
          console.log('✅ MetaMask permissions revoked - user will need to re-authorize on next connect');
        } catch (revokeErr: any) {
          // Some versions of MetaMask might not support wallet_revokePermissions
          // This is fine - permissions will naturally expire or user can manually revoke
          console.warn('⚠️ Could not revoke permissions (may not be supported):', revokeErr.message);
        }
      }
    } catch (err) {
      console.error('❌ Error during disconnect:', err);
    } finally {
      // Always clear local state
      setAccount(null);
      setConnected(false);
      setChainId(null);
      setProvider(null);
      setSigner(null);
      setShadowMerchantsContract(null);
      setMarketAuctionContract(null);
    }
  };

  // Listen for account and chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = (newChainId: string) => {
      const parsedChainId = parseInt(newChainId, 16);
      setChainId(parsedChainId);
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        connected,
        chainId,
        provider,
        signer,
        shadowMerchantsContract,
        marketAuctionContract,
        connectWallet,
        disconnectWallet,
        loading,
        error,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};


// Extend window interface for Ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
