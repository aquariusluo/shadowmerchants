import { createContext } from 'react';

export interface Web3ContextType {
  account: string | null;
  connected: boolean;
  chainId: number | null;
  provider: any; // BrowserProvider
  signer: any; // ethers.Signer
  shadowMerchantsContract: any; // Contract
  marketAuctionContract: any; // Contract
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const Web3Context = createContext<Web3ContextType | undefined>(undefined);
