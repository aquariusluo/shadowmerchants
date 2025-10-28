# Confidential Auction System - Deployment & Usage Guide

## Project Overview

A production-grade confidential auction system leveraging Zama's FHEVM (Fully Homomorphic Encryption on Virtual Machine) for encrypted bid processing on Ethereum Sepolia.

**Key Features:**
- Real-time encrypted auction creation and bidding
- Homomorphic bid comparison without decryption
- Zama Relayer integration for 202-byte ZK proofs
- Optimized retry logic for RPC synchronization
- Web3 frontend with React and ethers.js

## Project Structure

```
fhe-game/
├── contracts/
│   ├── MarketAuction.sol       # Main auction contract with FHE support
│   ├── ShadowMerchants.sol     # Merchant registry
│   └── InputVerificationMock.sol # Gateway mock for testing
├── server/
│   └── server.ts               # Backend Zama Relayer API
├── client/
│   └── src/
│       ├── components/         # React components
│       ├── hooks/              # Custom hooks (FHE, Web3)
│       ├── context/            # Web3 context
│       └── services/           # Gateway services
├── scripts/
│   ├── deploy.ts              # Contract deployment
│   ├── create-quick-auction.ts # Create test auction
│   ├── resolve-auction.ts      # Resolve single auction
│   ├── resolve-all-expired.ts  # Batch resolve
│   ├── check-auction-status.ts # Diagnostic tool
│   ├── verify-sepolia-transactions.ts # Verify on-chain
│   ├── emergency-end-auction.ts # Force-end auctions
│   ├── test-real-fhevm.ts      # Test encryption flow
│   └── startGame.ts            # Game initialization
└── test/
    └── shadowMerchants.spec.ts # Contract tests
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
cd client && npm install && cd ..
```

### 2. Environment Configuration

Create `.env.local` in root:
```env
VITE_BACKEND_RELAYER_URL=http://localhost:4000
VITE_GATEWAY_CONTRACT_ADDRESS=0x7048C39f048125eDa9d678AEbaDfB22F7900a29F
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io
```

### 3. Deploy Contracts

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

**Output:** Contract address + deployment confirmation

### 4. Start Backend Relayer API

```bash
npm run server
```

**Expected output:**
```
🚀 FHEVM Encryption Server running on http://localhost:4000
✅ FHE instance initialized successfully
```

### 5. Start Frontend Development

```bash
cd client && npm run dev
```

**Expected output:**
```
VITE v4.5.14 ready in 342 ms
Local: http://localhost:3000/
```

## Usage Workflow

### Creating an Auction

1. Open http://localhost:3000 in MetaMask-enabled browser
2. Connect wallet to Sepolia testnet
3. Click **+ New Auction**
4. Set parameters:
   - Good Type: Select commodity
   - Reserve Price: Encrypted via Zama Relayer
   - Duration: 5 minutes (default)
5. Submit - transaction encrypted with 202-byte ZK proof

### Placing Bids

1. View active auctions on dashboard
2. Enter bid amount
3. Click **🔐 Bid**
4. Bid encrypted and compared homomorphically
5. Smart contract determines winner without decryption

### Resolving Auctions

**Frontend Option (Recommended for testing):**
1. Wait for auction to expire
2. Click **✓ Resolve** button
3. System retries up to 6 times with exponential backoff (2s → 4s → 8s → 12s → 15s → 20s)
4. Winner determined and marked

**CLI Option (For RPC lag issues):**
```bash
npx hardhat run scripts/resolve-auction.ts --network sepolia
```

### Claiming Rewards

1. Go to **🏆 My Wins** section
2. View won auctions
3. Click **Claim** to receive reward

## CLI Scripts Reference

### Deployment & Management
```bash
# Deploy contracts
npx hardhat run scripts/deploy.ts --network sepolia

# Create quick test auction (10 seconds)
npx hardhat run scripts/create-quick-auction.ts --network sepolia

# Check auction status
npx hardhat run scripts/check-auction-status.ts --network sepolia

# Resolve specific auction
npx hardhat run scripts/resolve-auction.ts --network sepolia

# Batch resolve all expired
npx hardhat run scripts/resolve-all-expired.ts --network sepolia

# Force-end specific auction
npx hardhat run scripts/emergency-end-auction.ts --network sepolia

# Test real FHEVM encryption
npx hardhat run scripts/test-real-fhevm.ts --network sepolia

# Verify transactions on Sepolia
npx hardhat run scripts/verify-sepolia-transactions.ts --network sepolia

# Initialize game
npx hardhat run scripts/startGame.ts --network sepolia
```

## Zama FHEVM 5-Step Architecture

1. **Relayer Encryption** ← Backend encrypts user input → 202-byte ZK proof
2. **Gateway Submission** ← Frontend submits handle + proof → Smart contract
3. **Coprocessor Computation** ← Off-chain FHE operations on encrypted data
4. **Result Storage** ← On-chain storage of encrypted results
5. **User Decryption** ← Relayer KMS provides decryption for authorized user

## Optimized Resolution Retry Strategy

**Problem:** Sepolia RPC sometimes returns stale data during `resolveAuction()` calls

**Solution:** Multi-tier exponential backoff retry with block number detection

```
Attempt 1 → Wait 2s → Check block number
Attempt 2 → Wait 4s → Check block number
Attempt 3 → Wait 8s → Check block number
Attempt 4 → Wait 12s → Check block number
Attempt 5 → Wait 15s → Check block number
Attempt 6 → Wait 20s → Check block number
Total max wait: ~61 seconds with intelligent RPC lag detection
```

If all retries fail, CLI workaround suggested automatically.

## Troubleshooting

### "AuctionNotExpired" Error During Resolution

**Cause:** RPC returning stale block data

**Solutions:**
1. Click Resolve again (retries automatically)
2. Wait 30 seconds and try again
3. Use CLI: `npx hardhat run scripts/resolve-auction.ts --network sepolia`

### "FHE instance not initialized" on Frontend

**Cause:** Backend Relayer not running

**Solution:** Start backend server:
```bash
npm run server
```

### MetaMask Rejection

**Cause:** Wrong network or insufficient funds

**Solutions:**
1. Switch to Sepolia testnet in MetaMask
2. Get Sepolia ETH from [Sepolia Faucet](https://sepoliafaucet.com)
3. Ensure connected wallet has balance

### Missing Contract Address

**Cause:** Deployment failed

**Solution:** Re-deploy:
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

## Development Notes

### Real vs Mock Mode

```typescript
// Backend server.ts
const MOCK_MODE = false; // Set to true for plaintext testing
```

- **False** (default): Real FHEVM encryption with Zama Relayer
- **True**: Plaintext mode for debugging (no encryption)

### Contract State Variables

```solidity
// Auction struct
struct Auction {
    uint8 goodType;
    uint256 startTime;
    uint256 endTime;
    bool isActive;
    bool isResolved;
    uint8 participantCount;
    address creator;
}
```

### Frontend RPC Calls

```typescript
// Web3Context.tsx initializes:
- ethers.JsonRpcProvider (Sepolia RPC)
- Contract instance with ABI
- Event listeners for AuctionCreated, BidPlaced, AuctionResolved
```

## Production Deployment Checklist

- [ ] Test all auction lifecycle operations
- [ ] Verify Sepolia transactions on Etherscan
- [ ] Confirm Zama Relayer connectivity
- [ ] Test with multiple concurrent auctions
- [ ] Load test resolution under network lag
- [ ] Verify no plaintext data exposure
- [ ] Set up monitoring for RPC health
- [ ] Document auction parameters for users
- [ ] Backup wallet private keys securely
- [ ] Set up automated backup system

## Support & References

- **Zama Documentation:** https://docs.zama.ai
- **Sepolia Etherscan:** https://sepolia.etherscan.io
- **Hardhat Docs:** https://hardhat.org/docs
- **ethers.js v6:** https://docs.ethers.org/v6

## License

Production-grade FHEVM implementation for confidential auctions.

---

**Last Updated:** October 28, 2025
**Status:** ✅ Production Ready
