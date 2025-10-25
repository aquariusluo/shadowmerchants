# Shadow Merchants - Client (Frontend)

React frontend for the Shadow Merchants FHE game with MetaMask integration.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your deployed contract addresses:

```env
VITE_SHADOW_MERCHANTS_ADDRESS=0x...
VITE_MARKET_AUCTION_ADDRESS=0x...
VITE_NETWORK_NAME=sepolia
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
VITE_BLOCK_EXPLORER=https://sepolia.etherscan.io
```

### 3. Start Development Server

```bash
npm run dev
```

App opens at: `http://localhost:3000`

### 4. Connect with MetaMask

1. Install MetaMask extension
2. Create wallet or import existing
3. Add Sepolia network (auto-detects)
4. Get free Sepolia ETH from faucet
5. Click "Connect MetaMask" in app

### 5. Play the Game

- **View Game Status**: Check current round, players, game state
- **Join Game**: Participate in active games
- **Leave Game**: Exit current game
- **Bid on Auctions**: (Coming soon in UI)

## 📁 Project Structure

```
client/
├── src/
│   ├── components/          # React components
│   │   ├── ConnectButton.tsx
│   │   └── GameDashboard.tsx
│   ├── context/
│   │   └── Web3Context.tsx  # MetaMask provider
│   ├── config/
│   │   └── contracts.ts     # Contract ABIs
│   ├── App.tsx              # Main app component
│   ├── App.css              # Styles
│   └── main.tsx             # Entry point
├── index.html               # HTML template
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies
└── .env.example            # Environment template
```

## 🔧 Available Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 📦 Dependencies

- **React 18**: UI framework
- **Ethers.js 6**: Ethereum interaction
- **TypeScript**: Type safety
- **Vite**: Build tool

## 🔗 Network Configuration

### Sepolia Testnet (Current)
- Chain ID: 11155111
- RPC: https://eth-sepolia.g.alchemy.com/v2/
- Explorer: https://sepolia.etherscan.io/
- Faucet: https://sepoliafaucet.com/

## 🪟 MetaMask Integration

### Automatic Network Switching
When connecting MetaMask:
- Detects current network
- Prompts switch to Sepolia if needed
- Auto-adds Sepolia if not configured

### Wallet Methods Used
```javascript
window.ethereum.request({ method: 'eth_requestAccounts' })
window.ethereum.request({ method: 'wallet_switchEthereumChain' })
window.ethereum.request({ method: 'wallet_addEthereumChain' })
```

## 📝 Smart Contract Interaction

### Web3Context Features
```typescript
interface Web3ContextType {
  account: string | null;              // Connected wallet address
  connected: boolean;                  // Connection status
  chainId: number | null;              // Current blockchain
  provider: BrowserProvider | null;    // Ethers provider
  signer: ethers.Signer | null;        // Transaction signer
  shadowMerchantsContract: Contract;   // Game contract
  marketAuctionContract: Contract;     // Auction contract
  connectWallet: () => Promise<void>;  // Connect MetaMask
  disconnectWallet: () => void;        // Disconnect wallet
}
```

### Usage in Components

```typescript
import { useWeb3 } from '../context/Web3Context';

function MyComponent() {
  const { account, shadowMerchantsContract } = useWeb3();

  const joinGame = async () => {
    const tx = await shadowMerchantsContract.joinGame();
    await tx.wait();
  };

  return <button onClick={joinGame}>Join Game</button>;
}
```

## 🎨 Styling

- Responsive design (mobile-first)
- Gradient backgrounds
- Smooth transitions
- Dark mode ready

## 🚀 Deployment

### Build Production

```bash
npm run build
```

Outputs to `dist/` folder

### Deploy to Vercel

```bash
npm i -g vercel
vercel deploy
```

### Deploy to Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### Deploy to GitHub Pages

```bash
# Update vite.config.ts base URL
npm run build
git add dist/
git commit -m "Build for deployment"
git push
```

## 🔐 Security Considerations

- Private keys never stored in code
- Environment variables used for sensitive data
- MetaMask handles key management
- No sensitive data in localStorage
- HTTPS required for production

## 📱 Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- MetaMask extension required

## 🐛 Troubleshooting

### MetaMask Not Connecting
- Ensure extension is installed
- Verify you're on Sepolia network
- Clear browser cache

### Contract Functions Failing
- Check contract addresses in `.env.local`
- Verify contracts deployed to Sepolia
- Ensure sufficient gas (Sepolia ETH)

### Vite Development Issues
- Delete `node_modules` and `dist`
- Run `npm install` again
- Clear `.next` cache if upgrading

## 📚 Resources

- [Ethers.js Docs](https://docs.ethers.org/)
- [MetaMask Docs](https://docs.metamask.io/)
- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [Zama fhEVM](https://docs.zama.ai/)

## 📄 License

MIT

## 🤝 Contributing

Pull requests welcome! Please ensure:
- TypeScript types are correct
- Components are reusable
- Code follows existing style
- Tests pass

---

**Built with ❤️ for Zama fhEVM**
