/**
 * Auction Marketplace Component
 * Displays active auctions and allows players to place encrypted bids
 */
import React, { useState, useEffect } from 'react';
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

const GOOD_TYPE_NAMES: { [key: number]: string } = {
  1: '🌶️ Rare Spices',
  2: '🧵 Fine Silk',
  3: '💎 Precious Gems',
  4: '🏆 Gold Bars',
  5: '🏺 Ancient Artifacts',
};

const GOOD_TYPE_COLORS: { [key: number]: string } = {
  1: '#FF6B35', // Orange for spices
  2: '#F8B88B', // Light brown for silk
  3: '#9B59B6', // Purple for gems
  4: '#FFD700', // Gold for bars
  5: '#8B4513', // Brown for artifacts
};

export const AuctionMarketplace: React.FC = () => {
  const { marketAuctionContract, account, connected, provider, chainId } = useWeb3();
  const { instance, initializeFHE } = useFHEEncryption();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(false);
  const [bidding, setBidding] = useState<{ [key: string]: boolean }>({});
  const [bidAmounts, setBidAmounts] = useState<{ [key: string]: number }>({});
  const [userBids, setUserBids] = useState<{ [key: string]: boolean }>({});
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: number }>({});

  // Fetch active auctions
  const fetchAuctions = async () => {
    if (!marketAuctionContract || !connected) return;

    try {
      setLoading(true);
      console.log('📋 Fetching active auctions...');

      // Get active auction IDs
      const auctionIds = await marketAuctionContract.getActiveAuctions();
      console.log('✅ Found', auctionIds.length, 'active auctions');

      // Get details for each auction
      const auctionsData: Auction[] = [];
      const bids: { [key: string]: boolean } = {};

      for (const auctionId of auctionIds) {
        const idStr = auctionId.toString();
        try {
          const info = await marketAuctionContract.getAuctionInfo(idStr);

          auctionsData.push({
            auctionId: idStr,
            goodType: Number(info.goodType),
            startTime: Number(info.startTime),
            endTime: Number(info.endTime),
            isActive: info.isActive,
            isResolved: info.isResolved,
            participantCount: Number(info.participantCount),
            creator: info.creator,
          });

          // Check if user has bid on this auction
          const hasBid = await marketAuctionContract.hasUserBid(idStr, account);
          bids[idStr] = hasBid;
        } catch (err: any) {
          console.warn('⚠️ Error fetching auction', idStr, ':', err.message);
        }
      }

      setAuctions(auctionsData);
      setUserBids(bids);
    } catch (err: any) {
      console.error('❌ Error fetching auctions:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update time remaining for each auction
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

    console.log('🔐 [AuctionMarketplace] Initializing FHE encryption...');
    initializeFHE(provider, chainId);
  }, [connected, provider, chainId, initializeFHE]);

  // Fetch auctions on mount and periodically
  useEffect(() => {
    fetchAuctions();
    // Refresh every 60 seconds to minimize page flickering
    const interval = setInterval(fetchAuctions, 60000);
    return () => clearInterval(interval);
  }, [marketAuctionContract, connected, account]);

  // Handle bid placement
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
      console.log('🔐 Preparing bid amount:', bidAmount);

      let bidHandle: string;
      let bidProof: string;

      if (instance) {
        // FHE mode: encrypt the bid using REAL Zama SDK
        const contractAddress = marketAuctionContract.target || marketAuctionContract.address;
        const encryptedInput = instance.createEncryptedInput(contractAddress, account);
        encryptedInput.add64(bidAmount);
        const { handles, inputProof } = await encryptedInput.encrypt();  // ← NOW AWAITED!
        bidHandle = handles[0];
        bidProof = inputProof;
        console.log('✅ Bid encrypted via REAL FHEVM Zama SDK');
      } else {
        console.error('❌ FHE instance not available - cannot create encrypted bid');
        alert('FHE encryption not available. Please check console.');
        return;
      }

      console.log('📤 Placing bid on auction', auctionId, 'for amount', bidAmount);

      const tx = await marketAuctionContract.placeBid(auctionId, bidHandle, bidProof);
      console.log('✅ Bid transaction sent:', tx.hash);

      await tx.wait();
      console.log('✅ Bid confirmed!');

      // Reset bid amount and refresh
      setBidAmounts({ ...bidAmounts, [auctionId]: 0 });
      alert('✅ Bid placed successfully with REAL FHEVM encryption!');
      await fetchAuctions();
    } catch (err: any) {
      console.error('❌ Bid error:', err);
      alert(`Error placing bid: ${err.message}`);
    } finally {
      setBidding({ ...bidding, [auctionId]: false });
    }
  };

  // Format time remaining
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Ended';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!connected) {
    return <div style={{ padding: '20px', color: '#999' }}>Please connect wallet to view auctions</div>;
  }

  return (
    <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h2>🏪 Active Auctions</h2>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading auctions...</div>
      ) : auctions.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          No active auctions yet. Check back soon!
        </div>
      ) : (
        <div>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            {auctions.length} auction{auctions.length !== 1 ? 's' : ''} active
          </p>

          <div style={{ display: 'grid', gap: '15px' }}>
            {auctions.map((auction) => (
              <div
                key={auction.auctionId}
                style={{
                  border: `2px solid ${GOOD_TYPE_COLORS[auction.goodType] || '#ccc'}`,
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px',
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
                      {GOOD_TYPE_NAMES[auction.goodType] || `Good #${auction.goodType}`}
                    </h3>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      <p style={{ margin: '3px 0' }}>
                        👥 Bidders: <strong>{auction.participantCount}</strong>
                      </p>
                      <p style={{ margin: '3px 0' }}>
                        ⏱️ Time Left:{' '}
                        <strong style={{ color: timeRemaining[auction.auctionId] <= 60 ? '#ff6b6b' : '#000' }}>
                          {formatTime(timeRemaining[auction.auctionId])}
                        </strong>
                      </p>
                      <p style={{ margin: '3px 0' }}>
                        Status: {userBids[auction.auctionId] ? '✅ You bid' : '⭕ No bid yet'}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: auction.isActive ? '#4CAF50' : '#999',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    {auction.isActive ? '🟢 ACTIVE' : auction.isResolved ? '✓ RESOLVED' : '⚪ CLOSED'}
                  </div>
                </div>

                {/* Bid Input Section */}
                {auction.isActive && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        min="1"
                        placeholder="Bid amount (Gold)"
                        value={bidAmounts[auction.auctionId] || ''}
                        onChange={(e) =>
                          setBidAmounts({
                            ...bidAmounts,
                            [auction.auctionId]: parseInt(e.target.value) || 0,
                          })
                        }
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
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
                          fontSize: '14px',
                        }}
                      >
                        {bidding[auction.auctionId] ? 'Bidding...' : '🔐 Bid'}
                      </button>
                    </div>
                    <small style={{ color: '#999', marginTop: '5px', display: 'block' }}>
                      Your bid will be encrypted. Other players won't see your bid amount.
                    </small>
                  </div>
                )}

                {!auction.isActive && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '8px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '4px',
                      textAlign: 'center',
                      color: '#666',
                      fontSize: '13px',
                    }}
                  >
                    This auction has ended
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '13px', color: '#1976d2' }}>
        💡 <strong>Tip:</strong> Place your encrypted bids carefully! The highest bid wins. Your bid amount is hidden from other players.
      </div>
    </div>
  );
};
