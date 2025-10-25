/**
 * Admin Panel - Create Test Auctions
 * Visible only to accounts holding the auction manager or admin role.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toBeHex } from 'ethers';
import { useWeb3 } from '../hooks/useWeb3';

const GOOD_TYPES = [
  { id: 1, name: '🌶️ Rare Spices' },
  { id: 2, name: '🧵 Fine Silk' },
  { id: 3, name: '💎 Precious Gems' },
  { id: 4, name: '🏆 Gold Bars' },
  { id: 5, name: '🏺 Ancient Artifacts' },
];

interface AdminPanelProps {
  showPanel: boolean;
  setShowPanel: (show: boolean) => void;
}

const toHandle = (value: number) => toBeHex(BigInt(value), 32);

const AdminPanelComponent: React.FC<AdminPanelProps> = ({ showPanel, setShowPanel }) => {
  const { marketAuctionContract, account, connected } = useWeb3();
  const [selectedGoodType, setSelectedGoodType] = useState(1);
  const [reservePrice, setReservePrice] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [auctionStats, setAuctionStats] = useState<{ total: number; active: number; resolved: number } | null>(null);
  const [hasAuctionAccess, setHasAuctionAccess] = useState<boolean | null>(null);

  // Resolve whether the connected account has permission to create auctions.
  useEffect(() => {
    let mounted = true;

    const runCheck = async () => {
      if (!marketAuctionContract || !account) {
        if (mounted) setHasAuctionAccess(false);
        return;
      }

      try {
        const managerRole = await marketAuctionContract.AUCTION_MANAGER_ROLE();
        const adminRole = await marketAuctionContract.DEFAULT_ADMIN_ROLE();

        const [isManager, isAdmin] = await Promise.all([
          marketAuctionContract.hasRole(managerRole, account),
          marketAuctionContract.hasRole(adminRole, account),
        ]);

        if (mounted) {
          setHasAuctionAccess(Boolean(isManager || isAdmin));
        }
      } catch (error) {
        console.error('Error determining auction permissions:', error);
        if (mounted) {
          setHasAuctionAccess(false);
        }
      }
    };

    setHasAuctionAccess(null);
    void runCheck();

    return () => {
      mounted = false;
    };
  }, [marketAuctionContract, account]);

  const refreshStats = useCallback(async () => {
    if (!marketAuctionContract || !hasAuctionAccess) {
      return;
    }

    try {
      const stats = await marketAuctionContract.getAuctionStats();
      setAuctionStats({
        total: Number(stats.totalAuctions),
        active: Number(stats.activeAuctions),
        resolved: Number(stats.resolvedAuctions),
      });
    } catch (error) {
      console.error('Error fetching auction stats:', error);
    }
  }, [marketAuctionContract, hasAuctionAccess]);

  // Auto-refresh auction stats when accessible.
  useEffect(() => {
    if (!connected || !hasAuctionAccess) {
      return;
    }

    void refreshStats();
    const interval = setInterval(() => {
      void refreshStats();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [connected, hasAuctionAccess, refreshStats]);

  const readyToCreate = useMemo(() => Boolean(marketAuctionContract && hasAuctionAccess), [
    marketAuctionContract,
    hasAuctionAccess,
  ]);

  const handleCreateAuction = async () => {
    if (!marketAuctionContract) {
      alert('❌ Market Auction contract not loaded. Please try again in a moment.');
      return;
    }

    if (!account) {
      alert('❌ Wallet not connected.');
      return;
    }

    if (!hasAuctionAccess) {
      alert('❌ You do not have permission to create auctions.');
      return;
    }

    try {
      setLoading(true);
      console.log('🎯 Creating auction:', {
        goodType: selectedGoodType,
        reservePrice,
        account,
      });

      const handle = toHandle(reservePrice);
      const tx = await marketAuctionContract.createAuction(selectedGoodType, handle, '0x');
      console.log('📤 createAuction transaction hash:', tx.hash);

      await tx.wait();
      console.log('✅ Auction created successfully');

      alert(
        `✅ Auction created for ${
          GOOD_TYPES.find((good) => good.id === selectedGoodType)?.name ?? 'selected good'
        } with reserve price ${reservePrice}`
      );

      setSelectedGoodType(1);
      setReservePrice(100);
      await refreshStats();
    } catch (error: any) {
      console.error('❌ Error creating auction:', error);
      const accessError =
        error?.errorName === 'AccessControlUnauthorizedAccount' ||
        error?.data?.errorName === 'AccessControlUnauthorizedAccount';
      if (accessError) {
        alert('❌ You are not authorized to create auctions. Ask an admin to grant you the AUCTION_MANAGER_ROLE.');
        setHasAuctionAccess(false);
      } else {
        alert(`Error creating auction: ${error.message ?? error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return null;
  }

  const status = (() => {
    if (hasAuctionAccess === null) {
      return { message: '⏳ Checking admin permissions...', ok: false };
    }
    if (!marketAuctionContract) {
      return { message: '⏳ Contract loading...', ok: false };
    }
    if (!hasAuctionAccess) {
      return { message: '⛔ You do not have auction permissions.', ok: false };
    }
    return { message: '✅ Ready to create auctions', ok: true };
  })();

  return (
    <div style={{ marginTop: '30px', padding: '20px', border: '2px solid #ff6b6b', borderRadius: '8px', backgroundColor: '#fff5f5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>⚙️ Admin Panel</h2>
        <button
          onClick={() => setShowPanel(!showPanel)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {showPanel ? 'Hide' : 'Show'}
        </button>
      </div>

      <div
        style={{
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: status.ok ? '#d4edda' : '#fff3cd',
          borderRadius: '4px',
          fontSize: '13px',
          color: status.ok ? '#155724' : '#856404',
          border: status.ok ? '1px solid #c3e6cb' : '1px solid #ffc107',
        }}
      >
        {status.message}
      </div>

      {auctionStats && hasAuctionAccess && (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '14px' }}>
          📊 Auction Stats:
          <br />
          Total: {auctionStats.total} | Active: <strong style={{ color: '#4CAF50' }}>{auctionStats.active}</strong> | Resolved: {auctionStats.resolved}
        </div>
      )}

      {showPanel && hasAuctionAccess && (
        <div style={{ paddingTop: '15px', borderTop: '1px solid #ffcccc' }}>
          <p style={{ fontSize: '14px', color: '#666' }}>Create test auctions to start the game</p>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
              Select Good Type:
            </label>
            <select
              value={selectedGoodType}
              onChange={(event) => setSelectedGoodType(Number(event.target.value))}
              disabled={loading || !readyToCreate}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                opacity: loading || !readyToCreate ? 0.6 : 1,
              }}
            >
              {GOOD_TYPES.map((good) => (
                <option key={good.id} value={good.id}>
                  {good.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
              Reserve Price (Gold):
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={reservePrice}
              onChange={(event) => setReservePrice(Number(event.target.value))}
              disabled={loading || !readyToCreate}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                opacity: loading || !readyToCreate ? 0.6 : 1,
              }}
            />
            <small style={{ color: '#999', marginTop: '5px', display: 'block' }}>
              This price will be encrypted on-chain and hidden from players
            </small>
          </div>

          <button
            onClick={handleCreateAuction}
            disabled={loading || !readyToCreate}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading || !readyToCreate ? '#ccc' : '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !readyToCreate ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            {loading ? '⏳ Creating Auction...' : readyToCreate ? '✨ Create Auction' : '⏳ Loading...'}
          </button>

          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '13px', color: '#856404' }}>
            💡 <strong>Tips:</strong>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Create 3-5 auctions to make the game fun</li>
              <li>Vary the good types and reserve prices</li>
              <li>Reserve prices are encrypted on-chain</li>
              <li>Each auction lasts 5 minutes</li>
            </ul>
          </div>
        </div>
      )}

      {!hasAuctionAccess && status.ok === false && hasAuctionAccess !== null && (
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#856404' }}>
          Have an auction manager grant your wallet the required role to use this panel.
        </div>
      )}
    </div>
  );
};

export const AdminPanel = React.memo(AdminPanelComponent);
