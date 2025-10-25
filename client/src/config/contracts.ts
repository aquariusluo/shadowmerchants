/**
 * Contract ABIs for Shadow Merchants Game
 */

// Core Game Contract
export const SHADOW_MERCHANTS_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "startGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "endGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "joinGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "leaveGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "progressRound",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "regenerateEnergy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getGameInfo",
    outputs: [
      { internalType: "uint256", name: "currentRound", type: "uint256" },
      { internalType: "uint256", name: "gameStartTime", type: "uint256" },
      { internalType: "uint256", name: "lastRoundTime", type: "uint256" },
      { internalType: "uint8", name: "playerCount", type: "uint8" },
      { internalType: "bool", name: "gameActive", type: "bool" },
      { internalType: "bool", name: "gameEnded", type: "bool" },
      { internalType: "address", name: "winner", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "playerAddress", type: "address" }],
    name: "getPlayerInfo",
    outputs: [
      { internalType: "bool", name: "isActive", type: "bool" },
      { internalType: "bool", name: "hasJoined", type: "bool" },
      { internalType: "uint256", name: "joinedRound", type: "uint256" },
      { internalType: "uint8", name: "publicReputationTier", type: "uint8" },
      { internalType: "uint256", name: "lastActionTime", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getActivePlayers",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "playerAddress", type: "address" }],
    name: "canPlayerAct",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint256", name: "round", type: "uint256" },
    ],
    name: "PlayerJoined",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint256", name: "round", type: "uint256" },
    ],
    name: "PlayerLeft",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "startTime", type: "uint256" },
      { indexed: false, internalType: "uint8", name: "maxPlayers", type: "uint8" },
    ],
    name: "GameStarted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "winner", type: "address" },
      { indexed: false, internalType: "uint256", name: "endTime", type: "uint256" },
    ],
    name: "GameEnded",
    type: "event",
  },
] as const;

// Marketplace Auction Contract
export const MARKET_AUCTION_ABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "uint8", name: "goodType", type: "uint8" },
      { internalType: "externalEuint64", name: "reservePrice", type: "bytes32" },
      { internalType: "bytes", name: "proof", type: "bytes" },
    ],
    name: "createAuction",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "auctionId", type: "uint256" },
      { internalType: "externalEuint64", name: "bidAmount", type: "bytes32" },
      { internalType: "bytes", name: "proof", type: "bytes" },
    ],
    name: "placeBid",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "auctionId", type: "uint256" }],
    name: "resolveAuction",
    outputs: [{ internalType: "bool", name: "hasWinner", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getActiveAuctions",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "auctionId", type: "uint256" }],
    name: "getAuctionInfo",
    outputs: [
      { internalType: "uint8", name: "goodType", type: "uint8" },
      { internalType: "uint256", name: "startTime", type: "uint256" },
      { internalType: "uint256", name: "endTime", type: "uint256" },
      { internalType: "bool", name: "isActive", type: "bool" },
      { internalType: "bool", name: "isResolved", type: "bool" },
      { internalType: "uint8", name: "participantCount", type: "uint8" },
      { internalType: "address", name: "creator", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAuctionStats",
    outputs: [
      { internalType: "uint256", name: "totalAuctions", type: "uint256" },
      { internalType: "uint256", name: "activeAuctions", type: "uint256" },
      { internalType: "uint256", name: "resolvedAuctions", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "auctionId", type: "uint256" },
      { indexed: true, internalType: "uint8", name: "goodType", type: "uint8" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "uint256", name: "startTime", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "endTime", type: "uint256" },
    ],
    name: "AuctionCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "auctionId", type: "uint256" },
      { indexed: true, internalType: "address", name: "bidder", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "BidPlaced",
    type: "event",
  },
] as const;
