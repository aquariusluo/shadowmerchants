// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, euint16, euint64, ebool, eaddress, externalEuint8, externalEuint16, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ShadowMerchants
 * @dev Core game contract for the Shadow Merchants FHE game
 * @notice A confidential strategy game where players manage encrypted resources
 * and compete in a hidden marketplace using Fully Homomorphic Encryption
 */
contract ShadowMerchants is AccessControl {

    // ============ CONSTANTS ============

    bytes32 public constant GAME_MANAGER_ROLE = keccak256("GAME_MANAGER_ROLE");
    bytes32 public constant AUCTION_ROLE = keccak256("AUCTION_ROLE");
    bytes32 public constant MISSION_ROLE = keccak256("MISSION_ROLE");

    uint256 public constant INITIAL_GOLD = 1000;
    uint8 public constant INITIAL_REPUTATION = 100;
    uint8 public constant INITIAL_ENERGY = 100;
    uint8 public constant MAX_ENERGY = 100;
    uint8 public constant ENERGY_REGEN_AMOUNT = 10;
    uint256 public constant ENERGY_REGEN_INTERVAL = 300; // 5 minutes
    uint8 public constant MAX_PLAYERS = 20;
    uint256 public constant ROUND_DURATION = 900; // 15 minutes
    uint8 public constant MAX_ROUNDS = 20;

    // ============ STRUCTS ============

    struct GameState {
        uint256 currentRound;
        uint256 gameStartTime;
        uint256 lastRoundTime;
        uint8 maxPlayers;
        uint8 playerCount;
        bool gameActive;
        bool gameEnded;
        address winner;
    }

    struct PlayerProfile {
        // Encrypted private data
        euint64 gold;
        euint16 reputation;
        euint8 energy;
        euint8[10] inventory; // 10 inventory slots for different goods

        // Plaintext fallback data (used when FHE precompiles unavailable)
        bool usesPlaintext;
        uint64 goldPlain;
        uint16 reputationPlain;
        uint8 energyPlain;

        // Public data
        bool isActive;
        bool hasJoined;
        uint256 joinedRound;
        uint256 lastActionTime;
        uint256 lastEnergyRegen;
        uint8 publicReputationTier; // 1-5, derived from private reputation
    }

    // ============ STATE VARIABLES ============

    GameState public gameState;
    mapping(address => PlayerProfile) public players;
    address[] public activePlayers;
    mapping(address => uint256) private playerIndex; // Optimize: player => index in activePlayers for O(1) removal

    // Events for client synchronization
    event GameStarted(uint256 startTime, uint8 maxPlayers);
    event GameEnded(address indexed winner, uint256 endTime);
    event PlayerJoined(address indexed player, uint256 round);
    event PlayerLeft(address indexed player, uint256 round);
    event RoundProgressed(uint256 newRound, uint256 timestamp);
    event EnergyRegenerated(address indexed player, uint256 timestamp);
    event ResourcesUpdated(address indexed player, uint256 timestamp);

    // ============ ERRORS ============

    error GameNotActive();
    error GameAlreadyStarted();
    error GameFull();
    error PlayerAlreadyJoined();
    error PlayerNotActive();
    error InsufficientResources();
    error InvalidInput();
    error ActionTooFrequent();
    error GameNotEnded();

    // ============ MODIFIERS ============

    modifier onlyActiveGame() {
        if (!gameState.gameActive) revert GameNotActive();
        _;
    }

    modifier onlyActivePlayers() {
        if (!players[msg.sender].isActive) revert PlayerNotActive();
        _;
    }

    modifier rateLimited() {
        if (block.timestamp < players[msg.sender].lastActionTime + 10) {
            revert ActionTooFrequent();
        }
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GAME_MANAGER_ROLE, msg.sender);

        // Initialize game state
        gameState = GameState({
            currentRound: 0,
            gameStartTime: 0,
            lastRoundTime: 0,
            maxPlayers: MAX_PLAYERS,
            playerCount: 0,
            gameActive: false,
            gameEnded: false,
            winner: address(0)
        });
    }

    // ============ GAME MANAGEMENT ============

    /**
     * @dev Start a new game
     * @notice Only game managers can start games
     */
    function startGame() external onlyRole(GAME_MANAGER_ROLE) {
        if (gameState.gameActive) revert GameAlreadyStarted();

        gameState.gameActive = true;
        gameState.gameStartTime = block.timestamp;
        gameState.lastRoundTime = block.timestamp;
        gameState.currentRound = 1;
        gameState.gameEnded = false;
        gameState.winner = address(0);

        emit GameStarted(block.timestamp, gameState.maxPlayers);
    }

    /**
     * @dev End the current game
     * @notice Only game managers can end games
     */
    function endGame() external onlyRole(GAME_MANAGER_ROLE) {
        if (!gameState.gameActive) revert GameNotActive();

        _finalizeGame();
    }

    /**
     * @dev Progress to the next round
     * @notice Can be called by anyone when round time expires
     */
    function progressRound() external onlyActiveGame {
        if (block.timestamp < gameState.lastRoundTime + ROUND_DURATION) {
            revert ActionTooFrequent();
        }

        if (gameState.currentRound >= MAX_ROUNDS) {
            _finalizeGame();
            return;
        }

        gameState.currentRound++;
        gameState.lastRoundTime = block.timestamp;

        // Regenerate energy for all players
        _regenerateAllPlayersEnergy();

        emit RoundProgressed(gameState.currentRound, block.timestamp);
    }

    // ============ PLAYER MANAGEMENT ============

    /**
     * @dev Join the current game
     * @notice Players can join during the first 3 rounds
     * @param encryptedGold Encrypted starting gold amount
     * @param goldProof Proof for encrypted gold
     * @param encryptedReputation Encrypted starting reputation amount
     * @param reputationProof Proof for encrypted reputation
     * @param encryptedEnergy Encrypted starting energy amount
     * @param energyProof Proof for encrypted energy
     */
    function joinGame(
        externalEuint64 encryptedGold,
        bytes calldata goldProof,
        externalEuint16 encryptedReputation,
        bytes calldata reputationProof,
        externalEuint8 encryptedEnergy,
        bytes calldata energyProof
    ) external {
        if (!gameState.gameActive) revert GameNotActive();
        if (gameState.playerCount >= gameState.maxPlayers) revert GameFull();
        if (players[msg.sender].hasJoined) revert PlayerAlreadyJoined();
        if (gameState.currentRound > 3) revert GameNotActive(); // Can only join in first 3 rounds

        // Detect if using plaintext (empty proofs mean use defaults)
        bool usesPlaintext = goldProof.length == 0 && reputationProof.length == 0 && energyProof.length == 0;

        euint64 startingGold;
        euint16 startingReputation;
        euint8 startingEnergy;

        if (usesPlaintext) {
            // Plaintext mode: skip FHE calls entirely
            startingGold = euint64.wrap(bytes32(0));
            startingReputation = euint16.wrap(bytes32(0));
            startingEnergy = euint8.wrap(bytes32(0));
        } else {
            // FHE mode: decrypt inputs
            startingGold = FHE.fromExternal(encryptedGold, goldProof);
            startingReputation = FHE.fromExternal(encryptedReputation, reputationProof);
            startingEnergy = FHE.fromExternal(encryptedEnergy, energyProof);

            FHE.allowThis(startingGold);
            FHE.allowThis(startingReputation);
            FHE.allowThis(startingEnergy);
            FHE.allow(startingGold, msg.sender);
            FHE.allow(startingReputation, msg.sender);
            FHE.allow(startingEnergy, msg.sender);
        }

        euint8[10] memory emptyInventory;

        players[msg.sender] = PlayerProfile({
            gold: startingGold,
            reputation: startingReputation,
            energy: startingEnergy,
            inventory: emptyInventory,
            usesPlaintext: usesPlaintext,
            goldPlain: usesPlaintext ? uint64(INITIAL_GOLD) : 0,
            reputationPlain: usesPlaintext ? uint16(INITIAL_REPUTATION) : 0,
            energyPlain: usesPlaintext ? uint8(INITIAL_ENERGY) : 0,
            isActive: true,
            hasJoined: true,
            joinedRound: gameState.currentRound,
            lastActionTime: block.timestamp,
            lastEnergyRegen: block.timestamp,
            publicReputationTier: 2 // Starting tier (1-5 scale)
        });

        activePlayers.push(msg.sender);
        playerIndex[msg.sender] = activePlayers.length - 1; // Track index for O(1) removal
        gameState.playerCount++;

        emit PlayerJoined(msg.sender, gameState.currentRound);
    }

    /**
     * @dev Leave the current game - OPTIMIZED: O(1) removal using swap-and-pop
     * @notice Players can leave at any time
     */
    function leaveGame() external onlyActivePlayers {
        players[msg.sender].isActive = false;
        players[msg.sender].hasJoined = false;

        // O(1) removal using swap-and-pop with playerIndex mapping
        uint256 index = playerIndex[msg.sender];
        activePlayers[index] = activePlayers[activePlayers.length - 1];
        playerIndex[activePlayers[index]] = index;
        activePlayers.pop();
        delete playerIndex[msg.sender];

        gameState.playerCount--;

        emit PlayerLeft(msg.sender, gameState.currentRound);
    }

    // ============ RESOURCE MANAGEMENT ============

    /**
     * @dev Spend gold for game actions
     * @param amount Encrypted amount to spend
     * @param proof Input proof for the encrypted amount
     */
    function spendGold(externalEuint64 amount, bytes calldata proof)
        external
        onlyActivePlayers
        onlyActiveGame
        rateLimited
    {
        euint64 spendAmount = FHE.fromExternal(amount, proof);
        FHE.allowThis(spendAmount);

        PlayerProfile storage player = players[msg.sender];

        // Check if player has sufficient gold
        ebool hasSufficientGold = FHE.ge(player.gold, spendAmount);

        // This would typically revert in a real transaction if insufficient
        // For demo purposes, we'll just not spend if insufficient
        euint64 newGold = FHE.select(
            hasSufficientGold,
            FHE.sub(player.gold, spendAmount),
            player.gold
        );

        player.gold = newGold;
        player.lastActionTime = block.timestamp;

        // Update permissions
        FHE.allowThis(player.gold);
        FHE.allow(player.gold, msg.sender);

        emit ResourcesUpdated(msg.sender, block.timestamp);
    }

    /**
     * @dev Spend energy for game actions
     * @param amount Encrypted amount to spend
     * @param proof Input proof for the encrypted amount
     */
    function spendEnergy(externalEuint8 amount, bytes calldata proof)
        external
        onlyActivePlayers
        onlyActiveGame
        rateLimited
    {
        euint8 spendAmount = FHE.fromExternal(amount, proof);
        FHE.allowThis(spendAmount);

        PlayerProfile storage player = players[msg.sender];

        // Check if player has sufficient energy
        ebool hasSufficientEnergy = FHE.ge(player.energy, spendAmount);

        euint8 newEnergy = FHE.select(
            hasSufficientEnergy,
            FHE.sub(player.energy, spendAmount),
            player.energy
        );

        player.energy = newEnergy;
        player.lastActionTime = block.timestamp;

        // Update permissions
        FHE.allowThis(player.energy);
        FHE.allow(player.energy, msg.sender);

        emit ResourcesUpdated(msg.sender, block.timestamp);
    }

    /**
     * @dev Regenerate energy for a player
     * @notice Can be called by anyone, but limited by time interval
     */
    function regenerateEnergy() external onlyActivePlayers {
        PlayerProfile storage player = players[msg.sender];

        if (block.timestamp < player.lastEnergyRegen + ENERGY_REGEN_INTERVAL) {
            revert ActionTooFrequent();
        }

        // Regenerate energy (max 100)
        euint8 maxEnergy = FHE.asEuint8(uint8(MAX_ENERGY));
        euint8 regenAmount = FHE.asEuint8(uint8(ENERGY_REGEN_AMOUNT));
        euint8 newEnergy = FHE.add(player.energy, regenAmount);

        // Cap at max energy
        player.energy = FHE.select(
            FHE.gt(newEnergy, maxEnergy),
            maxEnergy,
            newEnergy
        );

        player.lastEnergyRegen = block.timestamp;

        // Update permissions
        FHE.allowThis(player.energy);
        FHE.allow(player.energy, msg.sender);

        emit EnergyRegenerated(msg.sender, block.timestamp);
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @dev Get public game information
     */
    function getGameInfo() external view returns (
        uint256 currentRound,
        uint256 gameStartTime,
        uint256 lastRoundTime,
        uint8 playerCount,
        bool gameActive,
        bool gameEnded,
        address winner
    ) {
        return (
            gameState.currentRound,
            gameState.gameStartTime,
            gameState.lastRoundTime,
            gameState.playerCount,
            gameState.gameActive,
            gameState.gameEnded,
            gameState.winner
        );
    }

    /**
     * @dev Get player's public information
     */
    function getPlayerInfo(address playerAddress) external view returns (
        bool isActive,
        bool hasJoined,
        uint256 joinedRound,
        uint8 publicReputationTier,
        uint256 lastActionTime
    ) {
        PlayerProfile memory player = players[playerAddress];
        return (
            player.isActive,
            player.hasJoined,
            player.joinedRound,
            player.publicReputationTier,
            player.lastActionTime
        );
    }

    /**
     * @dev Get list of active players
     */
    function getActivePlayers() external view returns (address[] memory) {
        return activePlayers;
    }

    /**
     * @dev Check if a player can perform actions (has sufficient resources)
     * @param playerAddress Address to check
     * @return Boolean indicating if player can act
     */
    function canPlayerAct(address playerAddress) external view returns (bool) {
        if (!players[playerAddress].isActive) return false;
        if (!gameState.gameActive) return false;
        if (block.timestamp < players[playerAddress].lastActionTime + 10) return false;
        return true;
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Regenerate energy for all active players
     */
    function _regenerateAllPlayersEnergy() internal {
        for (uint i = 0; i < activePlayers.length; i++) {
            address playerAddr = activePlayers[i];
            PlayerProfile storage player = players[playerAddr];

            if (player.isActive) {
                // Update timestamp to track energy regeneration
                // Full FHE energy calculations will be done when player calls regenerateEnergy()
                player.lastEnergyRegen = block.timestamp;
            }
        }
    }

    /**
     * @dev Determine the winner based on encrypted scores
     * @notice Simplified implementation for MVP
     */
    function determineWinner() internal view returns (address) {
        if (activePlayers.length == 0) return address(0);

        // For MVP, we'll use a simple approach
        // In a real implementation, this would use FHE operations to compare encrypted scores
        // For now, return the first active player as a placeholder
        return activePlayers[0];
    }

    function _finalizeGame() internal {
        if (!gameState.gameActive) {
            return;
        }

        gameState.gameActive = false;
        gameState.gameEnded = true;

        // Determine winner (simplified for MVP - highest gold wins)
        address winner = determineWinner();
        gameState.winner = winner;

        emit GameEnded(winner, block.timestamp);
    }

    // ============ ACCESS CONTROL ============

    /**
     * @dev Grant auction role to auction contract
     */
    function grantAuctionRole(address auctionContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(AUCTION_ROLE, auctionContract);
    }

    /**
     * @dev Grant mission role to mission contract
     */
    function grantMissionRole(address missionContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MISSION_ROLE, missionContract);
    }
}
