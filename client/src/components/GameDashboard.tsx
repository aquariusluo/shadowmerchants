/**
 * Game Dashboard Component
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { useFHEEncryption } from '../hooks/useFHEEncryption';
import { AuctionMarketplace } from './AuctionMarketplace';
import { AdminPanel } from './AdminPanel';
import { AdminUtils } from './AdminUtils';
import { BrowserProvider, Contract, ethers } from 'ethers';

interface GameInfo {
  currentRound: number;
  gameStartTime: number;
  lastRoundTime: number;
  playerCount: number;
  gameActive: boolean;
  gameEnded: boolean;
  winner: string;
}

const INITIAL_GOLD = 1000;
const INITIAL_REPUTATION = 100;
const INITIAL_ENERGY = 100;

export const GameDashboard: React.FC = () => {
  const { shadowMerchantsContract, marketAuctionContract, account, connected, provider, chainId } = useWeb3();
  const { instance, isLoading: fheLoading, error: fheError, initializeFHE, encryptStartingResources } = useFHEEncryption();
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [fheInitialized, setFheInitialized] = useState(false);
  const [playerResources, setPlayerResources] = useState<{ gold: number; energy: number; reputation: number } | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [hasActiveAuctions, setHasActiveAuctions] = useState(false);

  const fetchGameInfo = async () => {
    if (!shadowMerchantsContract || !connected) {
      console.log('⚠️ Skipping fetch - contract:', !!shadowMerchantsContract, 'connected:', connected);
      return;
    }
    try {
      setLoading(true);
      console.log('🔄 Fetching game info...');

      // Try with the main contract first
      let rawInfo;
      try {
        rawInfo = await shadowMerchantsContract.getGameInfo();
        console.log('✅ Called via MetaMask provider');
      } catch (mainErr: any) {
        console.warn('⚠️ Main provider failed, trying fallback RPC...', mainErr.message);
        // Fallback to direct RPC provider
        const fallbackProvider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
        const contractAddr = shadowMerchantsContract.target || shadowMerchantsContract.address;
        const fallbackContract = new Contract(
          contractAddr,
          shadowMerchantsContract.interface,
          fallbackProvider
        );
        rawInfo = await fallbackContract.getGameInfo();
        console.log('✅ Called via fallback RPC provider');
      }

      console.log('📋 RAW response:', rawInfo);
      console.log('📋 RAW response keys:', Object.keys(rawInfo));
      console.log('📋 Response [0] (currentRound):', rawInfo[0], '-> Number:', Number(rawInfo[0]));
      console.log('📋 Response [4] (gameActive):', rawInfo[4]);
      console.log('📋 Response [3] (playerCount):', rawInfo[3], '-> Number:', Number(rawInfo[3]));

      const info = {
        currentRound: Number(rawInfo[0]),
        gameStartTime: Number(rawInfo[1]),
        lastRoundTime: Number(rawInfo[2]),
        playerCount: Number(rawInfo[3]),
        gameActive: rawInfo[4],
        gameEnded: rawInfo[5],
        winner: rawInfo[6],
      };

      console.log('📊 Parsed game info:', info);
      setGameInfo(info);

      // Fetch player info if player has joined
      try {
        let pInfo;
        try {
          pInfo = await shadowMerchantsContract.getPlayerInfo(account);
        } catch (mainErr: any) {
          console.warn('⚠️ Main provider failed for player info, trying fallback...', mainErr.message);
          const fallbackProvider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
          const contractAddr = shadowMerchantsContract.target || shadowMerchantsContract.address;
          const fallbackContract = new Contract(
            contractAddr,
            shadowMerchantsContract.interface,
            fallbackProvider
          );
          pInfo = await fallbackContract.getPlayerInfo(account);
        }

        console.log('👤 Player info received:', {
          isActive: pInfo[0],
          hasJoined: pInfo[1],
        });

        // Only set playerInfo if player has actually joined
        if (pInfo[1]) {
          setPlayerInfo({
            isActive: pInfo[0],
            hasJoined: pInfo[1],
            joinedRound: Number(pInfo[2]),
            publicReputationTier: Number(pInfo[3]),
            lastActionTime: Number(pInfo[4]),
          });
        } else {
          setPlayerInfo(null);
        }
      } catch (e: any) {
        console.log('ℹ️ Player not joined yet:', e.message);
        // Player not joined yet
        setPlayerInfo(null);
      }

      // Check for active auctions
      if (marketAuctionContract) {
        try {
          const activeAuctions = await marketAuctionContract.getActiveAuctions();
          setHasActiveAuctions(activeAuctions.length > 0);
          console.log('📊 Active auctions:', activeAuctions.length);
        } catch (auctionErr: any) {
          console.warn('⚠️ Could not check active auctions:', auctionErr.message);
          setHasActiveAuctions(false);
        }
      }
    } catch (err: any) {
      console.error('❌ Error fetching game info:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = useCallback(async () => {
    if (!shadowMerchantsContract) return;
    try {
      setActionLoading(true);
      console.log('🎮 Starting game...');

      // Try with signer first
      try {
        const tx = await shadowMerchantsContract.startGame();
        console.log('✅ Start game transaction sent:', tx.hash);
        await tx.wait();
        console.log('✅ Game started successfully!');
      } catch (mainErr: any) {
        console.warn('⚠️ Main provider failed, trying fallback...', mainErr.message);
        const fallbackProvider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
        const fallbackContract = new Contract(
          shadowMerchantsContract.address,
          shadowMerchantsContract.interface,
          fallbackProvider
        );
        const tx = await fallbackContract.startGame();
        await tx.wait();
        console.log('✅ Game started via fallback!');
      }

      await fetchGameInfo();
      alert('✅ Game started successfully!');
    } catch (err: any) {
      console.error('❌ Error starting game:', err);
      alert(`Error starting game: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }, [shadowMerchantsContract]);

  const handleJoinGame = useCallback(async () => {
    // Check if there are any active auctions FIRST (before anything else)
    if (marketAuctionContract) {
      try {
        console.log('🔍 Checking for active auctions...');
        const activeAuctions = await marketAuctionContract.getActiveAuctions();
        console.log('📊 Active auctions found:', activeAuctions.length);

        if (activeAuctions.length === 0) {
          alert(
            '⚠️ No active auctions found!\n\n' +
            'There are currently no auctions in the game. ' +
            'Please create some auctions using the Admin Panel before joining.'
          );
          console.log('User blocked from joining - no auctions available');
          return;
        }
      } catch (auctionErr: any) {
        console.warn('⚠️ Could not check auctions:', auctionErr.message);
        // Continue anyway if we can't check
      }
    }

    // Only after auction validation passes, check for MetaMask connection
    if (!shadowMerchantsContract || !account) {
      console.error('Contract or account missing');
      return;
    }

    // Wait for FHE to be ready
    if (fheLoading) {
      alert('⏳ FHE is still initializing. Please wait a moment and try again...');
      return;
    }

    if (!instance) {
      console.warn('⚠️ FHE instance not ready yet');
      alert('⏳ FHE encryption is initializing. Please wait a few seconds and try again.');
      return;
    }

    try {
      setActionLoading(true);
      console.log('🎮 Attempting to join game with encrypted resources...');
      console.log('📍 Account:', account);

      // Get contract address (ethers v6 uses .target)
      const contractAddress = shadowMerchantsContract.target || shadowMerchantsContract.address;
      console.log('📍 Contract address:', contractAddress);
      console.log('📍 Contract target:', shadowMerchantsContract.target);
      console.log('📍 Contract address property:', shadowMerchantsContract.address);

      if (!contractAddress) {
        throw new Error('Contract address not found');
      }

      // Step 1: Encrypt starting resources
      console.log('🔐 Encrypting starting resources...');
      const encrypted = encryptStartingResources(
        INITIAL_GOLD,
        INITIAL_REPUTATION,
        INITIAL_ENERGY,
        contractAddress as string,
        account
      );

      console.log('✅ Resources encrypted, prepared for contract call');
      console.log('📊 Encrypted parameters:');
      console.log('  - Gold:', encrypted.encryptedGold);
      console.log('  - Reputation:', encrypted.encryptedReputation);
      console.log('  - Energy:', encrypted.encryptedEnergy);

      // Step 2: Call contract with encrypted inputs
      console.log('🔧 Estimating gas for joinGame with encrypted inputs...');
      try {
        const gasEstimate = await shadowMerchantsContract.joinGame.estimateGas(
          encrypted.encryptedGold,
          encrypted.goldProof,
          encrypted.encryptedReputation,
          encrypted.reputationProof,
          encrypted.encryptedEnergy,
          encrypted.energyProof
        );
        console.log('✅ Gas estimate successful:', gasEstimate.toString());
      } catch (gasErr: any) {
        console.error('❌ Gas estimation failed:', gasErr);
        console.error('  Message:', gasErr.message);
        console.error('  Reason:', gasErr.reason);
        throw new Error(`Transaction will fail: ${gasErr.reason || gasErr.message}`);
      }

      console.log('📤 Sending joinGame transaction with encrypted inputs...');
      const tx = await shadowMerchantsContract.joinGame(
        encrypted.encryptedGold,
        encrypted.goldProof,
        encrypted.encryptedReputation,
        encrypted.reputationProof,
        encrypted.encryptedEnergy,
        encrypted.energyProof
      );
      console.log('✅ Transaction sent:', tx.hash);

      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt?.transactionHash);

      // Store unencrypted starting resources for display
      setPlayerResources({
        gold: INITIAL_GOLD,
        energy: INITIAL_ENERGY,
        reputation: INITIAL_REPUTATION,
      });

      await fetchGameInfo();
      alert('✅ Successfully joined the game with encrypted resources!');
    } catch (err: any) {
      console.error('❌ Join game error:', err);
      alert(`Error joining game: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }, [shadowMerchantsContract, account, instance, marketAuctionContract, provider]);

  const handleLeaveGame = useCallback(async () => {
    if (!shadowMerchantsContract) return;
    try {
      setActionLoading(true);
      const tx = await shadowMerchantsContract.leaveGame();
      await tx.wait();
      setPlayerResources(null);
      await fetchGameInfo();
      alert('Left the game!');
    } catch (err: any) {
      alert(`Error leaving game: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }, [shadowMerchantsContract]);

  const handleResolveAuctions = useCallback(async () => {
    if (!marketAuctionContract) return;
    try {
      setActionLoading(true);
      console.log('⏳ Resolving expired auctions...');

      // Get all auction IDs
      const allAuctionIds: number[] = [];
      for (let i = 1; i <= 100; i++) {
        try {
          const auction = await marketAuctionContract.auctions(i);
          if (auction.auctionId !== undefined) {
            allAuctionIds.push(i);
          }
        } catch {
          break; // No more auctions
        }
      }

      if (allAuctionIds.length === 0) {
        alert('No auctions found');
        return;
      }

      console.log('🔍 Found auctions:', allAuctionIds);

      // Resolve them
      const tx = await marketAuctionContract.batchResolveAuctions(allAuctionIds);
      console.log('✅ Resolve transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Auctions resolved!');

      await fetchGameInfo();
      alert('✅ Expired auctions have been resolved!');
    } catch (err: any) {
      console.error('❌ Error resolving auctions:', err);
      alert(`Error resolving auctions: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }, [marketAuctionContract]);

  useEffect(() => {
    console.log('🎮 GameDashboard useEffect triggered:', {
      connected,
      hasContract: !!shadowMerchantsContract,
      hasAccount: !!account,
      fheInitialized,
      fheLoading,
      hasInstance: !!instance,
    });

    // Initialize FHE if not already done
    if (connected && provider && chainId && !fheInitialized && !fheLoading && !instance) {
      console.log('🔐 [GameDashboard] Initializing FHE...');
      initializeFHE(provider as BrowserProvider, chainId)
        .then(() => {
          console.log('✅ [GameDashboard] FHE initialization completed');
          setFheInitialized(true);
        })
        .catch((err: any) => {
          console.error('❌ [GameDashboard] FHE initialization failed:', err);
          setFheInitialized(true); // Mark as initialized anyway to show UI
        });
    }

    // Force mark as initialized after 5 seconds to avoid infinite loading
    const timeoutId = setTimeout(() => {
      if (!fheInitialized) {
        console.warn('⚠️ [GameDashboard] FHE init timeout, marking as initialized');
        setFheInitialized(true);
      }
    }, 5000);

    if (connected) {
      fetchGameInfo();
      // Refresh every 60 seconds to minimize page flickering
      const interval = setInterval(fetchGameInfo, 60000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeoutId);
      };
    }

    return () => clearTimeout(timeoutId);
  }, [connected, shadowMerchantsContract, account, provider, chainId, fheInitialized, fheLoading, instance]);

  // Update playerResources when playerInfo changes (for already-joined players)
  useEffect(() => {
    if (playerInfo && !playerResources) {
      console.log('📊 Player is already in game, setting resources');
      setPlayerResources({
        gold: INITIAL_GOLD,
        energy: INITIAL_ENERGY,
        reputation: INITIAL_REPUTATION,
      });
    }
  }, [playerInfo]);

  if (!connected) {
    return <div style={{ padding: '20px' }}>Please connect your wallet first.</div>;
  }

  if (loading || fheLoading) {
    return <div style={{ padding: '20px' }}>Loading game info{fheLoading ? ' and initializing FHE encryption' : ''}...</div>;
  }

  if (error || fheError) {
    return <div style={{ padding: '20px', color: 'red' }}>{error || fheError}</div>;
  }

  if (!fheInitialized) {
    return <div style={{ padding: '20px' }}>Initializing FHE encryption, please wait...</div>;
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px' }}>
      <h2>🎮 Shadow Merchants Game Dashboard</h2>

      {/* Admin Panel */}
      <AdminPanel showPanel={showAdminPanel} setShowPanel={setShowAdminPanel} />

      {/* Admin Utils - Grant Roles */}
      <AdminUtils />

      {gameInfo && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Game Status</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>Status:</td>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>
                  {gameInfo.gameActive ? '🟢 Active' : gameInfo.gameEnded ? '🔴 Ended' : '⚪ Idle'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>Current Round:</td>
                <td style={{ padding: '8px' }}>{gameInfo.currentRound}/20</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>Players:</td>
                <td style={{ padding: '8px' }}>{gameInfo.playerCount}/20</td>
              </tr>
              {gameInfo.gameEnded && (
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>Winner:</td>
                  <td style={{ padding: '8px' }}>{gameInfo.winner}</td>
                </tr>
              )}
            </tbody>
          </table>

          {!gameInfo.gameActive && !gameInfo.gameEnded && (
            <button
              onClick={handleStartGame}
              disabled={actionLoading}
              style={{
                marginTop: '10px',
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? 'Starting...' : '🎮 Start Game'}
            </button>
          )}
        </div>
      )}

      {/* Player Status Section */}
      {playerInfo && playerInfo.hasJoined && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Your Status</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>Status:</td>
                <td style={{ padding: '8px' }}>
                  {playerInfo.isActive ? '✓ Active' : '✗ Inactive'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>💰 Gold:</td>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#FFD700' }}>
                  {playerResources?.gold ?? 'Loading...'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>⚡ Energy:</td>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#FF6B6B' }}>
                  {playerResources?.energy ?? 'Loading...'} / 100
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>Reputation Tier:</td>
                <td style={{ padding: '8px' }}>{'⭐'.repeat(playerInfo.publicReputationTier)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px' }}>Joined in Round:</td>
                <td style={{ padding: '8px' }}>{playerInfo.joinedRound}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Join/Leave Button */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={playerInfo && playerInfo.hasJoined ? handleLeaveGame : handleJoinGame}
          disabled={
            actionLoading ||
            (gameInfo?.gameEnded ?? false) ||
            (!playerInfo && !gameInfo?.gameActive) ||
            (playerInfo && playerInfo.hasJoined && hasActiveAuctions)
          }
          style={{
            padding: '10px 20px',
            backgroundColor:
              playerInfo && playerInfo.hasJoined
                ? hasActiveAuctions
                  ? '#ccc' // Grey when auctions active
                  : '#ff9800' // Orange for Leave
                : '#2196F3', // Blue for Join
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: actionLoading || (playerInfo && playerInfo.hasJoined && hasActiveAuctions) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: actionLoading || (playerInfo && playerInfo.hasJoined && hasActiveAuctions) ? 0.6 : 1,
          }}
          title={
            playerInfo && playerInfo.hasJoined && hasActiveAuctions
              ? '⏳ Cannot leave while auctions are active. Wait for all auctions to finish.'
              : ''
          }
        >
          {actionLoading
            ? playerInfo && playerInfo.hasJoined
              ? 'Leaving...'
              : 'Joining...'
            : playerInfo && playerInfo.hasJoined
              ? hasActiveAuctions
                ? '⏳ Leave Game (Auctions Active)'
                : 'Leave Game'
              : 'Join Game'}
        </button>

        {hasActiveAuctions && (
          <button
            onClick={handleResolveAuctions}
            disabled={actionLoading}
            style={{
              marginLeft: '10px',
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              opacity: actionLoading ? 0.6 : 1,
            }}
            title="Resolve all expired auctions"
          >
            {actionLoading ? 'Resolving...' : '✓ Resolve Auctions'}
          </button>
        )}

        {!gameInfo?.gameActive && !playerInfo && (
          <p style={{ marginTop: '10px', color: '#999', fontSize: '14px' }}>Game is not active. Wait for the next round to join.</p>
        )}
        {playerInfo && playerInfo.hasJoined && hasActiveAuctions && (
          <p style={{ marginTop: '10px', color: '#ff9800', fontSize: '14px' }}>⏳ Auctions are still active. Click "✓ Resolve Auctions" to finish expired auctions, then you can leave.</p>
        )}
      </div>

      {/* Auction Marketplace */}
      <AuctionMarketplace />
    </div>
  );
};
