/**
 * Main App Component
 */
import React from 'react';
import { Web3Provider } from './context/Web3Context';
import { ConnectButton } from './components/ConnectButton';
import { AuctionBoard } from './components/AuctionBoard';
import './App.css';

const AppContent: React.FC = () => {
  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <h1>🏴 Shadow Merchants</h1>
          <p>Permissionless FHE Auction Marketplace on Ethereum Sepolia</p>
        </div>
        <div className="connect-section">
          <ConnectButton />
        </div>
      </header>

      <main className="main">
        <section className="intro">
          <h2>Welcome to Shadow Merchants</h2>
          <p>
            A privacy-first decentralized marketplace powered by Fully Homomorphic Encryption (FHE).
            Anyone can create auctions, place encrypted bids, and claim rewards without joining sessions.
          </p>
          <div className="features">
            <div className="feature">
              <span>🔐</span>
              <h3>Complete Privacy</h3>
              <p>Your bids remain encrypted on-chain - only the winner is revealed</p>
            </div>
            <div className="feature">
              <span>🎯</span>
              <h3>Permissionless</h3>
              <p>Create auctions and bid anytime - no sessions or joining required</p>
            </div>
            <div className="feature">
              <span>⛓️</span>
              <h3>Web3 Native</h3>
              <p>Built on Ethereum with MetaMask integration</p>
            </div>
          </div>
        </section>

        <AuctionBoard />

        <section className="info">
          <h3>How It Works</h3>
          <ol>
            <li><strong>Connect Your Wallet:</strong> Use MetaMask to connect to Sepolia testnet</li>
            <li><strong>Create or Browse Auctions:</strong> Create new auctions or view existing ones</li>
            <li><strong>Place Encrypted Bids:</strong> Your bid amounts are private and encrypted</li>
            <li><strong>Win & Claim:</strong> Auctions auto-resolve, winners can claim rewards</li>
            <li><strong>Repeat:</strong> No sessions - bid on any auction anytime!</li>
          </ol>
        </section>
      </main>

      <footer className="footer">
        <p>Built with ❤️ using Zama's fhEVM | Network: Ethereum Sepolia (Testnet)</p>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
};

export default App;