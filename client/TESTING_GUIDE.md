# Shadow Merchants Frontend - Complete Testing Guide

## Current Status ✅

### Contracts Deployed & Verified
- **ShadowMerchants**: 0x5603712980FAB2a66bE32682eB67c527F4F696a0
- **MarketAuction**: 0xC702640b01AAA18A933102eB68c02a1F3d797022
- **Network**: Ethereum Sepolia (11155111)
- **RPC**: https://sepolia.drpc.org

### Contract Data Verified ✅
```
Direct RPC call result:
- currentRound: 1
- gameActive: true
- playerCount: 0
- gameEnded: false
```

## Frontend Fixes Applied ✅

1. **Vite Fast Refresh Fix**
   - Separated context creation into `src/context/Web3Context.types.ts`
   - Removed non-component exports from provider file
   - Fixed React plugin compatibility

2. **Contract Instance Configuration Fix**
   - Use `ethersProvider` for read operations
   - Connect `ethersSigner` for write operations
   - Proper initialization of both contracts

3. **Enhanced Diagnostics**
   - Added comprehensive logging in Web3Context
   - Network verification on connection
   - Contract test call on initialization
   - New DiagnosticsPage component for debugging

## Testing Steps

### Step 1: Access the Application
```
URL: http://localhost:3000
Browser: Chrome/Firefox/Brave (must have MetaMask)
```

### Step 2: Open Developer Console
```
Chrome: F12 or Cmd+Option+I
Look for Console tab
```

### Step 3: Connect to MetaMask
1. Click "Connect MetaMask" button
2. MetaMask popup appears
3. Select your wallet
4. Confirm you're on Sepolia testnet
5. Click "Connect"

### Step 4: Check Console Logs
After connecting, you should see:

```
🔍 Env Variables: {
  shadowAddress: "0x5603712980FAB2a66bE32682eB67c527F4F696a0",
  auctionAddress: "0xC702640b01AAA18A933102eB68c02a1F3d797022"
}

🌐 Network Diagnostics: {
  chainId: 11155111n,
  chainName: "sepolia",
  expectedChainId: 11155111,
  isCorrectChain: true
}

👤 Signer Diagnostics: {
  signerAddress: "0x[YOUR_ADDRESS]",
  rpcUrl: "https://sepolia.drpc.org"
}

✅ Test call succeeded: {
  currentRound: 1,
  gameActive: true,
  playerCount: 0
}

📝 Contract Details: {
  contractAddress: "0x5603712980FAB2a66bE32682eB67c527F4F696a0",
  hasGetGameInfo: true,
  runner: Signer { ... }
}
```

### Step 5: Verify Game Dashboard
Look for:
- ✅ Game Status shows: **🟢 Active**
- ✅ Current Round: **1/20**
- ✅ Players: **0/20**
- ✅ **💙 Join Game button is visible**

### Step 6: Run Diagnostics Tool
1. Scroll down to "Diagnostics" section
2. Click "Run Diagnostics" button
3. Verify output shows:
   - connected: true
   - chainId: 11155111n
   - network.name: "sepolia"
   - gameActive: true in gameInfo

## What Each Console Message Means

| Message | Meaning | Status |
|---------|---------|--------|
| `🔍 Env Variables` | Environment variables loaded | ✅ Setup |
| `🌐 Network Diagnostics` | Connected to correct network | ✅ Network |
| `isCorrectChain: true` | On Sepolia (11155111) | ✅ Correct |
| `👤 Signer Diagnostics` | Wallet connected | ✅ Auth |
| `✅ Test call succeeded` | Contract call works | ✅ Contract |
| `currentRound: 1` | Game data retrieved correctly | ✅ Data |
| `gameActive: true` | Game is running | ✅ State |

## Testing Game Features

### 1. Join Game
- Click "Join Game" button
- MetaMask popup appears for transaction
- Confirm transaction
- Wait for confirmation
- Button should change to "Leave Game"
- Console shows: `EnergyRegenerated` or `PlayerJoined` event

### 2. Check Player Status
- After joining, should see:
  - "Your Status" section
  - Your account status (Active/Inactive)
  - Reputation Tier (⭐ stars)
  - Joined Round: 1
- "Leave Game" button appears

### 3. Leave Game
- Click "Leave Game" button
- Confirm in MetaMask
- Should see "Join Game" button again

## Troubleshooting

### Issue: "Connect MetaMask" button doesn't work
**Solution**:
- Ensure MetaMask is installed
- Refresh page
- Check browser console for errors

### Issue: gameActive shows false after connecting
**Solution**:
- Check console logs for network chain ID
- Verify you're on Sepolia (11155111)
- Try "Run Diagnostics"
- Check if contract address is correct

### Issue: "Could not Fast Refresh" errors
**Solution**:
- Close dev server (Ctrl+C)
- Clear node_modules cache: `npm run dev`
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)

### Issue: Contract call fails with "CALL_EXCEPTION"
**Solution**:
- Verify contract address in `.env.local`
- Check you're on Sepolia testnet
- Verify RPC endpoint is working
- Try "Run Diagnostics" button

## Expected Behavior Checklist

- [ ] MetaMask connection prompts appear
- [ ] Console shows successful test call
- [ ] Game Dashboard shows 🟢 Active status
- [ ] Current Round shows 1/20
- [ ] Join Game button is clickable and visible
- [ ] Clicking Join Game opens MetaMask transaction
- [ ] After join, Your Status section appears
- [ ] Leave Game button appears after joining
- [ ] Diagnostics button shows correct network and data
- [ ] No "Could not Fast Refresh" errors (only on startup)

## File Structure

```
client/
├── src/
│   ├── context/
│   │   ├── Web3Context.tsx (Provider component)
│   │   └── Web3Context.types.ts (Context & types)
│   ├── hooks/
│   │   └── useWeb3.ts (useWeb3 hook)
│   ├── components/
│   │   ├── ConnectButton.tsx
│   │   ├── GameDashboard.tsx
│   │   ├── DiagnosticsPage.tsx (NEW - debugging tool)
│   │   └── App.tsx
│   └── abi/
│       └── index.ts (Contract ABIs)
├── .env.local (Contract addresses & RPC)
└── vite.config.ts
```

## Key Configuration

### .env.local
```
VITE_SHADOW_MERCHANTS_ADDRESS=0x5603712980FAB2a66bE32682eB67c527F4F696a0
VITE_MARKET_AUCTION_ADDRESS=0xC702640b01AAA18A933102eB68c02a1F3d797022
VITE_RPC_URL=https://sepolia.drpc.org
VITE_CHAIN_ID=11155111
```

## Success Criteria

All of the following must be true:
1. ✅ Page loads without JavaScript errors
2. ✅ MetaMask connection works
3. ✅ Console shows successful test call with correct data
4. ✅ Game Dashboard shows 🟢 Active status
5. ✅ Join Game button is visible and clickable
6. ✅ Diagnostics shows correct network and contract data
7. ✅ No persistent Fast Refresh errors

Once all criteria are met, the frontend is properly integrated with the Sepolia testnet contracts!
