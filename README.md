# FHE Game: Encrypted Auction System - Shadow Merchants

A privacy-preserving auction marketplace leveraging **Zama FHEVM** (Fully Homomorphic Encryption Virtual Machine) for confidential bidding on Ethereum Sepolia testnet.

## Architecture Overview

This system implements Zama's 5-step encrypted computation flow:

```
Step 1: User Relayer Encryption (Backend)
   └─ User inputs plaintext → Backend encrypts via Zama Relayer SDK
   └─ Returns: encrypted handle + ZK proof

Step 2: Gateway Contract Submission (On-Chain)
   └─ Frontend sends encrypted values to MarketAuction contract
   └─ Gateway validates ZK proofs and stores encrypted state

Step 3: Coprocessor Off-Chain Computation
   └─ Coprocessor listens to events and performs FHE operations
   └─ Example: homomorphic bid comparisons on ciphertext

Step 4: Result Storage (On-Chain)
   └─ Gateway updates encrypted results on Sepolia
   └─ Results remain encrypted unless user decrypts

Step 5: User Decryption (Backend/KMS)
   └─ Authorized users decrypt results via Relayer or KMS
   └─ Private: only user can decrypt their data
```

## Key Features

- **Blind Auctions**: Bid amounts encrypted on-chain, never revealed plaintext
- **Privacy-Preserving**: Bid comparisons happen on encrypted data
- **Gateway Verification**: Async proof validation via Zama's InputVerification contract
- **Plaintext Fallback**: Contract supports both real FHEVM and plaintext modes
- **MOCK_MODE**: Test without Relayer when services are down

## Quick Start

### Prerequisites

- Node.js v18+
- npm or yarn
- Git
- MetaMask or compatible Ethereum wallet

### 1. Clone Repository

```bash
git clone https://github.com/aquariusluo/shadowmerchants.git
cd shadowmerchants
```

### 2. Install Dependencies

```bash
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 3. Environment Setup

Create `.env` in root:

```bash
# Sepolia RPC
RPC_URL=https://eth-sepolia.public.blastapi.io
CHAIN_ID=11155111

# Your private key (for deployment)
PRIVATE_KEY=your_private_key_here

# Contract addresses (after deployment)
MARKET_AUCTION_ADDRESS=0x...
SHADOW_MERCHANTS_ADDRESS=0x...
INPUT_VERIFICATION_ADDRESS=0x...

# Zama Gateway
FHEVM_GATEWAY_URL=https://relayer.testnet.zama.cloud
FHEVM_TIMEOUT=30000
```

Create `client/.env.local`:

```bash
VITE_MARKET_AUCTION_ADDRESS=0x...
VITE_INPUT_VERIFICATION_ADDRESS=0x...
VITE_NETWORK_NAME=sepolia
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://eth-sepolia.public.blastapi.io
VITE_BLOCK_EXPLORER=https://sepolia.etherscan.io
FHEVM_GATEWAY_URL=https://relayer.testnet.zama.cloud
FHEVM_TIMEOUT=30000
```

### 4. Deploy Smart Contracts

```bash
# Compile contracts
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# Verify on Etherscan (optional)
npx hardhat verify --network sepolia DEPLOYED_ADDRESS
```

The deployment script will:
1. Deploy `ShadowMerchants` contract
2. Deploy `MarketAuction` contract with gateway support
3. Output contract addresses to console
4. Save addresses to `.env`

### 5. Start All Services at Once

```bash
# From root directory
npm run start-all
```

Or start services individually:

**Backend Encryption Server (Terminal 1):**
```bash
cd server
npm run server
```
Server runs on `http://localhost:4000`

**Frontend Application (Terminal 2):**
```bash
cd client
npm run dev
```
Frontend runs on `http://localhost:3000`

**Proxy Server (Terminal 3 - if using domain):**
```bash
cd server
npm run proxy:prod
```
Proxy runs on `http://localhost:80`

### Backend Encryption Server

**Available endpoints:**
- `POST /api/encrypt/uint64` - Encrypt a uint64 value
- `POST /api/encrypt/batch` - Encrypt multiple values
- `GET /health` - Health check

When Zama Relayer is operational, the server will use real FHEVM encryption. During outages, set `MOCK_MODE=true` (default) to use plaintext fallback for testing.

### Frontend Application

Frontend runs on `http://localhost:3000` with:
- Hot Module Replacement (HMR) enabled
- MetaMask wallet connection
- Real-time auction updates
- Encrypted bid placement

## Deployment Workflow

### For Sepolia Testnet

#### Step 1: Setup Environment

1. **Fund wallet with Sepolia ETH**
   - Get testnet ETH from [Sepolia faucet](https://www.sepoliafaucet.com/)
   - You need ~0.5 ETH for contract deployment

2. **Configure environment variables**

   Create `.env` in root:
   ```bash
   SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io
   PRIVATE_KEY=your_private_key_hex
   ETHERSCAN_API_KEY=your_etherscan_key
   ```

3. **Verify setup**
   ```bash
   npm run compile
   ```

#### Step 2: Deploy Smart Contracts

```bash
# Single command to deploy everything
npx hardhat run scripts/deploy.ts --network sepolia
```

This will:
- Compile all contracts
- Deploy `ShadowMerchants` contract
- Deploy `MarketAuction` contract with gateway support
- Output contract addresses
- Save addresses to `.env`

**Example output:**
```
✓ ShadowMerchants deployed to: 0x1234...
✓ MarketAuction deployed to: 0x5678...
✓ Addresses saved to .env
```

#### Step 3: Verify Deployment (Optional)

```bash
# Verify contracts on Etherscan
npx hardhat verify --network sepolia CONTRACT_ADDRESS

# Check auction status
npx hardhat run scripts/check-auction-status.ts --network sepolia
```

#### Step 4: Update Configuration

Update `client/.env.local` with deployed contract addresses:
```bash
VITE_MARKET_AUCTION_ADDRESS=0x5678...
VITE_INPUT_VERIFICATION_ADDRESS=0x...
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://eth-sepolia.public.blastapi.io
```

#### Step 5: Start All Services

```bash
# Option 1: Start all services at once
npm run start-all

# Option 2: Start services individually
# Terminal 1: Backend
cd server && npm run server

# Terminal 2: Frontend
cd client && npm run dev

# Terminal 3: Proxy (optional, for domain access)
cd server && npm run proxy:prod
```

#### Step 6: Test the Application

1. **Open application**: `http://localhost:3000`
2. **Connect MetaMask** to Sepolia testnet
3. **Create an auction**:
   - Enter good type
   - Set reserve price (will be encrypted)
4. **Place encrypted bid**:
   - View transaction on Etherscan
   - Verify bid is encrypted
5. **Wait and resolve**:
   - After auction expires: `npx hardhat run scripts/resolve-auction.ts --network sepolia`
   - View winner details

### Additional Deployment Commands

```bash
# Quick test auction (10 seconds)
npx hardhat run scripts/create-quick-auction.ts --network sepolia

# Check specific auction
npx hardhat run scripts/check-auction-status.ts --network sepolia

# Resolve expired auctions
npx hardhat run scripts/resolve-all-expired.ts --network sepolia

# Emergency auction end
npx hardhat run scripts/emergency-end-auction.ts --network sepolia

# Test real FHEVM encryption
npx hardhat run scripts/test-real-fhevm.ts --network sepolia

# Verify transactions
npx hardhat run scripts/verify-sepolia-transactions.ts --network sepolia
```

## Recent Updates & Fixes

### WebSocket & MetaMask Connection Fixes (v1.0.1)

**Fixed Issues:**
- ✅ WebSocket HMR permission errors (port 443)
- ✅ MetaMask disconnection on chain switch
- ✅ Frontend server configuration for domain access
- ✅ API proxy routing between frontend and backend

**Changes Made:**
1. **Vite HMR Configuration** (`client/vite.config.ts`)
   - Changed from port 443 to localhost:3000
   - Added API proxy configuration
   - Improved development environment compatibility

2. **MetaMask Connection Persistence** (`client/src/context/Web3Context.tsx`)
   - Removed page reload on chain change
   - Chain switches now graceful and seamless
   - Connection persists across network changes

3. **API Routing** (`client/src/hooks/useFHEEncryption.ts`)
   - Updated to use proxied `/api` endpoints
   - Works with Vite proxy in development
   - Works with nginx/reverse proxy in production

**Testing:**
- ✅ WebSocket connections stable
- ✅ MetaMask connection persists
- ✅ Chain switching works without disconnection
- ✅ All services operational

### Running Current Version

```bash
# Latest code includes all fixes
git clone https://github.com/aquariusluo/shadowmerchants.git
cd shadowmerchants
npm install
npm run start-all
```

Then open `http://localhost:3000` and test:
1. Connect MetaMask wallet
2. Switch networks in MetaMask
3. Connection should persist (no page reload)
4. All features should work seamlessly

## Project Structure

```
shadowmerchants/
├── contracts/
│   ├── MarketAuction.sol          # Main auction contract (Gateway pattern)
│   ├── ShadowMerchants.sol        # Game management contract
│   └── InputVerificationMock.sol   # Mock for testing
│
├── server/
│   ├── server.ts                   # Encryption backend (Step 1)
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useFHEEncryption.ts # FHE encryption hook
│   │   │   └── useWeb3.ts          # Web3 provider hook
│   │   ├── components/
│   │   │   ├── AuctionBoard.tsx    # Main UI (Step 2)
│   │   │   └── ConnectButton.tsx
│   │   ├── abi/                    # Contract ABIs
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── scripts/
│   ├── deploy.ts                   # Deployment script
│   └── test-*.ts                   # Various test scripts
│
├── hardhat.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## How It Works

### Creating an Auction

1. **User enters auction details** (good type, reserve price)
2. **Frontend calls useFHEEncryption hook**
   - Hook requests backend to encrypt reserve price
   - Backend returns: encrypted handle + ZK proof
3. **Frontend submits to contract** with encrypted values
   - Contract receives externalEuint64 (encrypted handle)
   - Contract receives proof (for gateway verification)
4. **Contract stores encrypted state** on Sepolia
5. **Event emitted** for coprocessor to monitor

### Placing a Bid

1. **User enters bid amount**
2. **Frontend encrypts via backend**
3. **Frontend submits encrypted bid to contract**
4. **Contract compares encrypted bids** (homomorphically)
5. **Highest bidder tracked on-chain** (encrypted)

### Resolving Auction

1. **Admin calls resolveAuction()** after auction expires
2. **Contract determines encrypted winner**
3. **Winner can claim reward**
4. **Event emitted** with winner details

## Testing

### Unit Tests

```bash
npx hardhat test test/marketAuction.spec.js
npx hardhat test test/shadowMerchants.spec.ts
```

### Integration Tests

```bash
# Test encryption flow
node scripts/test-real-fhevm-encryption.ts

# Test gateway integration
node scripts/test-gateway-integration.ts
```

### Manual Testing on Sepolia

1. Open http://localhost:3000
2. Connect MetaMask wallet
3. Switch to Sepolia network
4. Create an auction
5. Verify transaction on Etherscan
6. Place an encrypted bid
7. Verify bid is encrypted in transaction data
8. Wait for auction to expire
9. Resolve auction
10. View winner on Etherscan

## MOCK_MODE vs Real FHEVM

### MOCK_MODE (Enabled by Default)

- **When to use**: Zama Relayer is down, testing contract logic
- **Encryption**: Plaintext values as hex (no real FHE)
- **Proof**: Empty (`0x`)
- **Contract behavior**: Plaintext fallback activated
- **Testing**: Full flow works, but no privacy

### Real FHEVM (When Relayer Online)

- **When to use**: Production, privacy-critical operations
- **Encryption**: Real homomorphic encryption via Zama
- **Proof**: Valid ZK proof from Zama gateway
- **Contract behavior**: Gateway verification mode
- **Testing**: Full end-to-end encrypted flow

### Switching Modes

Edit `/server/server.ts` line 39:

```typescript
// MOCK mode (for testing without Relayer)
const MOCK_MODE = true;

// Real FHEVM encryption
const MOCK_MODE = false;
```

## Environment Variables Reference

### Server (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| RPC_URL | Sepolia RPC endpoint | https://eth-sepolia.public.blastapi.io |
| PRIVATE_KEY | Deployer account private key | 0x... |
| MARKET_AUCTION_ADDRESS | Deployed contract address | 0x... |
| FHEVM_GATEWAY_URL | Zama gateway endpoint | https://relayer.testnet.zama.cloud |
| MOCK_MODE | Use plaintext fallback | true/false |

### Client (client/.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| VITE_MARKET_AUCTION_ADDRESS | Contract address for frontend | 0x... |
| VITE_INPUT_VERIFICATION_ADDRESS | Gateway contract address | 0x... |
| VITE_CHAIN_ID | Sepolia chain ID | 11155111 |
| VITE_RPC_URL | Sepolia RPC | https://eth-sepolia.public.blastapi.io |
| FHEVM_GATEWAY_URL | Zama gateway | https://relayer.testnet.zama.cloud |

## Troubleshooting

### WebSocket & MetaMask Issues

#### "MetaMask disconnects when switching networks"

**Status**: ✅ FIXED (v1.0.1)

**Old behavior**: Page would reload, losing connection
**New behavior**: Connection persists seamlessly

If you're still experiencing this:
- Clear browser cache: `Ctrl+Shift+Delete`
- Hard refresh page: `Ctrl+Shift+R`
- Update to latest code: `git pull origin main`

#### "WebSocket connection failed" or "permission denied 443"

**Status**: ✅ FIXED (v1.0.1)

**Fix**: HMR now uses `localhost:3000` instead of port 443

Verify configuration in `client/vite.config.ts`:
```typescript
hmr: {
  host: 'localhost',
  port: 3000,
  protocol: 'http',
}
```

#### "Connection to backend failed"

**Cause**: Backend server not running

**Solution**:
```bash
cd server
npm run server
```

Check health: `curl http://localhost:4000/health`

### General Issues

### "Relayer didn't response correctly"

**Cause**: Zama Relayer service is down

**Solution**:
- Check [Zama status page](https://status.zama.ai)
- Use MOCK_MODE for testing while Relayer recovers
- Set `MOCK_MODE=true` in server code

### "Contract not ready"

**Cause**: Contract addresses not configured

**Solution**:
- Run deployment: `npx hardhat run scripts/deploy.ts --network sepolia`
- Update addresses in `.env` and `client/.env.local`
- Restart server and frontend

### "Insufficient funds"

**Cause**: Wallet has no Sepolia ETH

**Solution**:
- Get testnet ETH from [faucet](https://www.sepoliafaucet.com/)
- Wait for tokens to arrive
- Retry transaction

## Security Considerations

- **Private keys**: Never commit `.env` with real private keys
- **Testnet only**: This is for Sepolia testnet (use real FHEVM on mainnet)
- **Encryption**: Real FHE requires live Zama Relayer
- **Smart contracts**: Audit before mainnet deployment

## Gas Optimization

Current gas costs on Sepolia:
- Create auction: ~800k gas
- Place bid: ~600k gas
- Resolve auction: ~200k gas

Use MOCK_MODE to reduce gas during testing.

## Resources

- [Zama FHEVM Docs](https://docs.zama.ai/fhevm)
- [Ethereum Sepolia Testnet](https://sepolia.etherscan.io)
- [Hardhat Documentation](https://hardhat.org)
- [Vite Documentation](https://vitejs.dev)

## License

MIT

## Support

For issues and questions:
1. Check [GitHub Issues](https://github.com/aquariusluo/fhe-game/issues)
2. Review [Zama documentation](https://docs.zama.ai)
3. Submit detailed bug reports with logs

## Next Steps

- [ ] Receive testnet ETH from faucet
- [ ] Deploy contracts to Sepolia
- [ ] Update environment variables
- [ ] Start backend server
- [ ] Open frontend at localhost:3000
- [ ] Create first auction
- [ ] Test bid placement
- [ ] Monitor Etherscan for transactions
- [ ] Wait for Zama Relayer recovery for real FHEVM testing
