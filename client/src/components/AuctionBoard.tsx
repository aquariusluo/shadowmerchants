/**
 * Auction Board Component
 *
 * Zama FHEVM Flow:
 * Step 1: User enters data → Backend Relayer encrypts (useFHEEncryption hook)
 * Step 2: Frontend submits encrypted handle + proof to Gateway contract (HERE)
 * Step 3: Coprocessor listens to events, performs FHE operations off-chain
 * Step 4: Gateway updates encrypted results on-chain
 * Step 5: User can decrypt results via Relayer (KMS)
 *
 * Permissionless marketplace: anyone can create auctions, bid, and claim rewards
 * No game sessions, no join/leave mechanics
 */
import React, { useState, useEffect } from 'react';
import { toBeHex } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';
import { useFHEEncryption } from '../hooks/useFHEEncryption';

interface Auction {
  auctionId: string;
  goodType: number;
  startTime: number;
  endTime: number;
  isActive: boolean;
  isResolved: boolean;
  participantCount: number;
  creator: string;
}

interface WonAuction {
  auctionId: string;
  goodType: number;
  hasClaimed: boolean;
}

const GOOD_TYPE_NAMES: { [key: number]: string } = {
  1: '🌶️ Rare Spices',
  2: '🧵 Fine Silk',
  3: '💎 Precious Gems',
  4: '🏆 Gold Bars',
  5: '🏺 Ancient Artifacts',
};

const GOOD_TYPE_COLORS: { [key: number]: string } = {
  1: '#FF6B35',
  2: '#F8B88B',
  3: '#9B59B6',
  4: '#FFD700',
  5: '#8B4513',
};

export const AuctionBoard: React.FC = () => {
  const { marketAuctionContract, account, connected, provider, chainId } = useWeb3();
  const { instance, initializeFHE } = useFHEEncryption();

  // Auction management
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([]);
  const [loading, setLoading] = useState(false);
  const [bidding, setBidding] = useState<{ [key: string]: boolean }>({});
  const [bidAmounts, setBidAmounts] = useState<{ [key: string]: number }>({});
  const [userBids, setUserBids] = useState<{ [key: string]: boolean }>({});
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: number }>({});
  const [claiming, setClaiming] = useState<{ [key: string]: boolean }>({});
  const [resolving, setResolving] = useState<{ [key: string]: boolean }>({});

  // Admin state - for future role-based access control
  const [isAdmin, setIsAdmin] = useState(true); // Temporarily allow everyone to create auctions

  // Create auction form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ goodType: 1, reservePrice: 100, durationSeconds: 300 });
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user is admin
  const checkAdminStatus = async () => {
    if (!marketAuctionContract || !account) {
      setIsAdmin(false);
      return;
    }

    try {
      const AUCTION_MANAGER_ROLE = await marketAuctionContract.AUCTION_MANAGER_ROLE();
      const hasRole = await marketAuctionContract.hasRole(AUCTION_MANAGER_ROLE, account);
      setIsAdmin(hasRole);
    } catch (err: any) {
      console.warn('⚠️ Error checking admin status:', err.message);
      setIsAdmin(false);
    }
  };

  // Fetch active auctions
  const fetchAuctions = async () => {
    if (!marketAuctionContract || !connected) return;

    try {
      console.log('📋 Fetching active auctions...');
      const auctionIds = await marketAuctionContract.getActiveAuctions();
      console.log('✅ Contract returned', auctionIds.length, 'auction IDs');

      const newAuctionsMap = new Map<string, Auction>();
      const newBids: { [key: string]: boolean } = {};

      for (const auctionId of auctionIds) {
        const idStr = auctionId.toString();
        try {
          const info = await marketAuctionContract.getAuctionInfo(idStr);
          const hasBid = await marketAuctionContract.hasUserBid(idStr, account);

          newAuctionsMap.set(idStr, {
            auctionId: idStr,
            goodType: Number(info.goodType),
            startTime: Number(info.startTime),
            endTime: Number(info.endTime),
            isActive: info.isActive,
            isResolved: info.isResolved,
            participantCount: Number(info.participantCount),
            creator: info.creator,
          });
          newBids[idStr] = hasBid;
        } catch (err: any) {
          console.error(`❌ Error fetching auction #${idStr}:`, err.message, err.code);
        }
      }

      // Smart merge: update existing auctions in place, remove resolved ones
      setAuctions(prev => {
        // Update existing auctions with new data (preserves DOM position)
        const updated = prev
          .map(a => newAuctionsMap.has(a.auctionId) ? newAuctionsMap.get(a.auctionId)! : a)
          .filter(a => newAuctionsMap.has(a.auctionId)); // Remove resolved auctions

        // Add new auctions that weren't in the previous list
        const existingIds = new Set(prev.map(a => a.auctionId));
        const newAuctions = Array.from(newAuctionsMap.values())
          .filter(a => !existingIds.has(a.auctionId));

        return [...updated, ...newAuctions];
      });

      // Update bids without replacing entire object
      setUserBids(prev => ({ ...prev, ...newBids }));

      console.log('📈 Successfully updated', newAuctionsMap.size, 'auctions');
    } catch (err: any) {
      console.error('❌ Error fetching auction IDs:', err.message);
    }
  };

  // Fetch user's won auctions
  const fetchMyWins = async () => {
    if (!marketAuctionContract || !connected || !account) return;

    try {
      console.log('🏆 Fetching wins for account:', account);
      const winIds = await marketAuctionContract.getMyWins(account);
      console.log('📊 getMyWins() returned', winIds.length, 'wins');

      const winsMap = new Map<string, WonAuction>();

      for (const winId of winIds) {
        const idStr = winId.toString();
        try {
          const info = await marketAuctionContract.getAuctionInfo(idStr);
          const claimed = await marketAuctionContract.hasClaimedReward(idStr, account);

          winsMap.set(idStr, {
            auctionId: idStr,
            goodType: Number(info.goodType),
            hasClaimed: claimed,
          });
        } catch (err: any) {
          console.warn('⚠️ Error fetching win', idStr, ':', err.message);
        }
      }

      // Smart merge: update claimed status, remove completed wins if needed
      setWonAuctions(prev => {
        // Update existing wins with new claim status
        const updated = prev
          .map(w => winsMap.has(w.auctionId) ? winsMap.get(w.auctionId)! : w)
          .filter(w => winsMap.has(w.auctionId));

        // Add new wins
        const existingIds = new Set(prev.map(w => w.auctionId));
        const newWins = Array.from(winsMap.values())
          .filter(w => !existingIds.has(w.auctionId));

        return [...updated, ...newWins];
      });

      console.log('📈 Total wins updated:', winsMap.size);
    } catch (err: any) {
      console.error('❌ Error fetching wins:', err.message);
    }
  };

  // Update time remaining
  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining: { [key: string]: number } = {};

      auctions.forEach((auction) => {
        const timeLeft = Math.max(0, auction.endTime - now);
        remaining[auction.auctionId] = timeLeft;
      });

      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auctions]);

  // Initialize FHE on mount
  useEffect(() => {
    if (!connected || !provider || !chainId) return;

    console.log('🔐 [AuctionBoard] Initializing FHE encryption...');
    initializeFHE(provider, chainId);
  }, [connected, provider, chainId, initializeFHE]);

  // Fetch data on mount and set up event listeners
  useEffect(() => {
    if (!marketAuctionContract || !connected) return;

    // Initial load
    fetchAuctions();
    fetchMyWins();
    checkAdminStatus();

    // Listen for AuctionResolved events - update wins immediately
    const handleAuctionResolved = async (
      auctionId: any,
      winner: string,
      goodType: number,
      resolvedAt: number
    ) => {
      console.log(`🎉 Auction #${auctionId.toString()} resolved! Winner: ${winner}`);
      // Only refresh wins and the specific auction
      await fetchMyWins();
      // Update just the resolved auction in the list
      setAuctions(prev => prev.map(a =>
        a.auctionId === auctionId.toString()
          ? { ...a, isActive: false, isResolved: true }
          : a
      ));
    };

    // Listen for BidPlaced events - update auction participant count
    const handleBidPlaced = async (
      auctionId: any,
      bidder: string,
      timestamp: number
    ) => {
      console.log(`💰 New bid on auction #${auctionId.toString()}`);
      // Lightly update just that auction's participant count
      const auctionInfo = await marketAuctionContract.getAuctionInfo(auctionId.toString());
      setAuctions(prev => prev.map(a =>
        a.auctionId === auctionId.toString()
          ? { ...a, participantCount: Number(auctionInfo.participantCount) }
          : a
      ));
    };

    // Set up event listeners
    if (marketAuctionContract.on) {
      marketAuctionContract.on('AuctionResolved', handleAuctionResolved);
      marketAuctionContract.on('BidPlaced', handleBidPlaced);
    }

    // Long-tail safety poll: every 60 seconds, do a full refresh
    // This catches any missed events and ensures eventual consistency
    const safetyInterval = setInterval(() => {
      console.log('🔄 Safety refresh (60s interval)');
      fetchAuctions();
      fetchMyWins();
    }, 60000);

    // Cleanup
    return () => {
      clearInterval(safetyInterval);
      if (marketAuctionContract.off) {
        marketAuctionContract.off('AuctionResolved', handleAuctionResolved);
        marketAuctionContract.off('BidPlaced', handleBidPlaced);
      }
    };
  }, [marketAuctionContract, connected, account]);

  // Handle place bid
  const handlePlaceBid = async (auctionId: string) => {
    if (!marketAuctionContract || !account) {
      alert('Contract or account not ready');
      return;
    }

    const bidAmount = bidAmounts[auctionId];
    if (!bidAmount || bidAmount <= 0) {
      alert('Please enter a valid bid amount');
      return;
    }

    try {
      setBidding({ ...bidding, [auctionId]: true });

      let bidHandle: string;
      let bidProof: string;

      if (instance) {
        const contractAddress = marketAuctionContract.target || marketAuctionContract.address;
        const encryptedInput = instance.createEncryptedInput(contractAddress, account);
        encryptedInput.add64(bidAmount);
        const { handles, inputProof } = await encryptedInput.encrypt();  // ← AWAIT ADDED!
        bidHandle = handles[0];
        bidProof = inputProof;
      } else {
        bidHandle = toBeHex(BigInt(bidAmount), 32);
        bidProof = '0x';
      }

      const tx = await marketAuctionContract.placeBid(auctionId, bidHandle, bidProof);
      await tx.wait();

      setBidAmounts({ ...bidAmounts, [auctionId]: 0 });
      alert('✅ Bid placed successfully!');
      await fetchAuctions();
    } catch (err: any) {
      console.error('❌ Bid error:', err);
      alert(`Error placing bid: ${err.message}`);
    } finally {
      setBidding({ ...bidding, [auctionId]: false });
    }
  };

  // Handle claim reward
  const handleClaimReward = async (auctionId: string) => {
    if (!marketAuctionContract) {
      alert('Contract not ready');
      return;
    }

    try {
      setClaiming({ ...claiming, [auctionId]: true });

      const tx = await marketAuctionContract.claimReward(auctionId);
      await tx.wait();

      alert('✅ Reward claimed!');
      await fetchMyWins();
    } catch (err: any) {
      console.error('❌ Claim error:', err);
      alert(`Error claiming reward: ${err.message}`);
    } finally {
      setClaiming({ ...claiming, [auctionId]: false });
    }
  };

  // Handle resolve auction (admin only) - OPTIMIZED RETRY APPROACH
  const handleResolveAuction = async (auctionId: string) => {
    if (!marketAuctionContract || !provider) {
      alert('Contract or provider not ready');
      return;
    }

    try {
      setResolving({ ...resolving, [auctionId]: true });
      console.log('⏳ Resolving auction', auctionId);

      // Step 1: Calculate wait time based on auction expiry
      const auction = auctions.find(a => a.auctionId === auctionId);
      if (auction) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = auction.endTime - now;
        console.log(`⏱️ Time until expiry: ${timeUntilExpiry}s`);

        if (timeUntilExpiry > 0) {
          const waitTime = (timeUntilExpiry + 5) * 1000; // Add 5 second buffer
          console.log(`⏳ Waiting ${waitTime / 1000}s for auction to expire...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // Auction expired locally, add minimal delay
          console.log('⏳ Auction expired locally, checking RPC sync...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Step 2: OPTIMIZED RETRY WITH EXPONENTIAL BACKOFF + RPC DETECTION
      let retries = 0;
      const maxRetries = 6; // Increased from 3 to 6
      let lastError: any = null;
      const backoffDelays = [2000, 4000, 8000, 12000, 15000, 20000]; // Exponential: 2s, 4s, 8s, 12s, 15s, 20s
      let lastBlockNumber = 0;

      while (retries <= maxRetries) {
        try {
          // Check current block number to detect RPC lag
          const currentBlock = await provider.getBlockNumber();
          const blockProgressed = currentBlock > lastBlockNumber;
          lastBlockNumber = currentBlock;

          console.log(
            `📤 Attempt ${retries + 1}/${maxRetries + 1}: Sending resolve transaction... ` +
            `(Block: ${currentBlock}${blockProgressed ? ' ✓' : ' [STALE]'})`
          );

          const tx = await marketAuctionContract.resolveAuction(auctionId);
          console.log('✅ Resolve transaction sent:', tx.hash);
          await tx.wait();

          alert('✅ Auction resolved!');
          console.log('✅ Auction #' + auctionId + ' resolved successfully');

          // Refresh UI
          await fetchAuctions();
          await fetchMyWins();
          return; // Success!
        } catch (err: any) {
          lastError = err;

          // Check if it's RPC stale data error
          if (err.message.includes('AuctionNotExpired') || err.code === 'CALL_EXCEPTION') {
            retries++;
            if (retries <= maxRetries) {
              const delay = backoffDelays[retries - 1] || 20000;
              console.warn(
                `⚠️ RPC lag detected. Retry ${retries}/${maxRetries + 1} in ${delay / 1000}s...`
              );
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              // Final attempt failed
              throw lastError;
            }
          } else {
            // Non-recoverable error, fail immediately
            throw err;
          }
        }
      }

      throw lastError;
    } catch (err: any) {
      console.error('❌ Resolve error:', err);

      // Classify and explain the error
      let errorMessage = err.message;
      if (err.message.includes('AuctionAlreadyResolved')) {
        errorMessage = 'This auction has already been resolved';
      } else if (err.message.includes('AuctionNotExpired') || err.code === 'CALL_EXCEPTION') {
        errorMessage =
          '⏰ RPC sync lag detected. All frontend retries exhausted.\n\n' +
          '💡 Solution: Use CLI command:\n' +
          'npx hardhat run scripts/resolve-auction.ts --network sepolia\n\n' +
          'The CLI bypasses RPC lag by running directly from the server.';
      } else if (err.message.includes('NotAuthorized') || err.message.includes('DEFAULT_ADMIN_ROLE')) {
        errorMessage = 'Only administrators can resolve auctions';
      } else if (err.message.includes('AuctionNotFound')) {
        errorMessage = 'Auction not found';
      }

      alert(`❌ Error resolving auction:\n\n${errorMessage}`);
    } finally {
      setResolving({ ...resolving, [auctionId]: false });
    }
  };

  // Handle create auction
  const handleCreateAuction = async () => {
    if (!marketAuctionContract || !account) {
      alert('Contract or account not ready');
      return;
    }

    try {
      setCreating(true);

      let reserveHandle: string;
      let reserveProof: string;

      if (instance) {
        const contractAddress = marketAuctionContract.target || marketAuctionContract.address;
        const encryptedInput = instance.createEncryptedInput(contractAddress, account);
        encryptedInput.add64(createForm.reservePrice);
        const { handles, inputProof } = await encryptedInput.encrypt();

        // Send with proof to use gateway verification
        reserveHandle = handles[0];
        reserveProof = inputProof;

        console.log('🔐 [AuctionBoard] Auction encryption ready');
        console.log('   Handle:', reserveHandle.substring(0, 20) + '...');
        console.log('   Proof length:', inputProof.length, 'bytes');
        console.log('   Using Zama Gateway for proof verification');
      } else {
        reserveHandle = toBeHex(BigInt(createForm.reservePrice), 32);
        reserveProof = '0x';
      }

      const tx = await marketAuctionContract.createAuction(
        createForm.goodType,
        reserveHandle,
        reserveProof,
        createForm.durationSeconds
      );
      await tx.wait();

      alert('✅ Auction created!');
      setShowCreateForm(false);
      setCreateForm({ goodType: 1, reservePrice: 100, durationSeconds: 300 });
      await fetchAuctions();
    } catch (err: any) {
      console.error('❌ Create auction error:', err);
      alert(`Error creating auction: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Ended';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered');
      await fetchAuctions();
      await fetchMyWins();
    } catch (err: any) {
      console.error('❌ Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (!connected) {
    return <div style={{ padding: '20px', color: '#999' }}>Please connect wallet to use the marketplace</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      {/* Create Auction Section - Admin Only */}
      {isAdmin ? (
        <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>🏪 Create Auction (Admin Only)</h3>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {showCreateForm ? 'Cancel' : '+ New Auction'}
            </button>
          </div>

          {showCreateForm && (
            <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #eee' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Good Type</label>
                  <select
                    value={createForm.goodType}
                    onChange={(e) => setCreateForm({ ...createForm, goodType: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  >
                    {Object.entries(GOOD_TYPE_NAMES).map(([type, name]) => (
                      <option key={type} value={type}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Reserve Price</label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.reservePrice}
                    onChange={(e) => setCreateForm({ ...createForm, reservePrice: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Auction Duration</label>
                  <select
                    value={createForm.durationSeconds}
                    onChange={(e) => setCreateForm({ ...createForm, durationSeconds: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value={180}>3 minutes</option>
                    <option value={300}>5 minutes (default)</option>
                    <option value={600}>10 minutes</option>
                    <option value={900}>15 minutes</option>
                    <option value={1800}>30 minutes</option>
                    <option value={3600}>1 hour</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleCreateAuction}
                disabled={creating}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: creating ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                {creating ? 'Creating...' : 'Create Auction'}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Active Auctions */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0, marginBottom: '15px' }}>🎯 Active Auctions</h2>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>Loading...</div>
        ) : auctions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No active auctions</div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {auctions.map((auction) => (
              <div
                key={auction.auctionId}
                style={{
                  border: `2px solid ${GOOD_TYPE_COLORS[auction.goodType]}`,
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0' }}>{GOOD_TYPE_NAMES[auction.goodType]}</h3>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      <p style={{ margin: '2px 0' }}>👥 Bidders: <strong>{auction.participantCount}</strong></p>
                      <p style={{ margin: '2px 0' }}>⏱️ Time: <strong style={{ color: timeRemaining[auction.auctionId] <= 60 ? '#ff6b6b' : '#000' }}>{formatTime(timeRemaining[auction.auctionId])}</strong></p>
                      <p style={{ margin: '2px 0' }}>Status: {userBids[auction.auctionId] ? '✅ You bid' : '⭕ No bid'}</p>
                    </div>
                  </div>
                  <div style={{ padding: '6px 12px', backgroundColor: '#4CAF50', color: 'white', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                    🟢 ACTIVE
                  </div>
                </div>

                {auction.isActive && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      placeholder="Bid amount"
                      value={bidAmounts[auction.auctionId] || ''}
                      onChange={(e) => setBidAmounts({ ...bidAmounts, [auction.auctionId]: parseInt(e.target.value) || 0 })}
                      style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                      disabled={bidding[auction.auctionId]}
                    />
                    <button
                      onClick={() => handlePlaceBid(auction.auctionId)}
                      disabled={bidding[auction.auctionId]}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: bidding[auction.auctionId] ? '#ccc' : '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: bidding[auction.auctionId] ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      {bidding[auction.auctionId] ? 'Bidding...' : '🔐 Bid'}
                    </button>
                  </div>
                )}

                {auction.isActive && isAdmin && !auction.isResolved && timeRemaining[auction.auctionId] === 0 && (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#856404', fontWeight: 'bold' }}>⏳ Auction expired - ready to resolve</span>
                    <button
                      onClick={() => handleResolveAuction(auction.auctionId)}
                      disabled={resolving[auction.auctionId]}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: resolving[auction.auctionId] ? '#ccc' : '#FFC107',
                        color: '#333',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: resolving[auction.auctionId] ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {resolving[auction.auctionId] ? 'Resolving...' : '✓ Resolve'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Wins */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: 0, marginBottom: '15px' }}>🏆 My Wins</h2>

        {wonAuctions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No wins yet. Keep bidding!</div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {wonAuctions.map((win) => (
              <div
                key={win.auctionId}
                style={{
                  border: `1px solid ${GOOD_TYPE_COLORS[win.goodType]}`,
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: win.hasClaimed ? '#f0f0f0' : '#fffacd',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>
                    {GOOD_TYPE_NAMES[win.goodType]} - Auction #{win.auctionId}
                  </p>
                  <small style={{ color: '#666' }}>
                    {win.hasClaimed ? '✅ Reward claimed' : '⏳ Reward pending'}
                  </small>
                </div>

                {!win.hasClaimed && (
                  <button
                    onClick={() => handleClaimReward(win.auctionId)}
                    disabled={claiming[win.auctionId]}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: claiming[win.auctionId] ? '#ccc' : '#FF9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: claiming[win.auctionId] ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {claiming[win.auctionId] ? 'Claiming...' : 'Claim'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
