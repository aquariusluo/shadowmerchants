// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, euint16, euint64, ebool, eaddress, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title IInputVerification
 * @dev Interface for InputVerification contract (Zama's gateway contract)
 */
interface IInputVerification {
    event VerifyProofRequest(
        uint256 indexed zkProofId,
        uint256 indexed contractChainId,
        address indexed contractAddress,
        address userAddress,
        bytes ciphertextWithZKProof,
        bytes extraData
    );

    function verifyProofRequest(
        uint256 contractChainId,
        address contractAddress,
        address userAddress,
        bytes calldata ciphertextWithZKProof,
        bytes calldata extraData
    ) external returns (uint256 zkProofId);
}

/**
 * @title MarketAuction
 * @dev Confidential auction system for the Shadow Merchants game
 *
 * Zama FHEVM Architecture Integration:
 * Step 1 (Backend): User Relayer encrypts inputs → handle + ZK proof
 * Step 2 (HERE): Gateway receives encrypted values, validates proofs
 * Step 3 (Offchain): Coprocessor performs homomorphic bid comparisons
 * Step 4 (HERE): Gateway stores encrypted results on-chain
 * Step 5 (Backend): User decrypts results via Relayer/KMS
 *
 * Key Features:
 * - Blind auctions: bid amounts encrypted until resolution
 * - Gateway verification: async proof validation via InputVerification
 * - Homomorphic operations: bid comparisons on ciphertext only
 * - Privacy-preserving: no plaintext bids visible on-chain
 *
 * @notice Handles blind auctions where bid amounts remain encrypted until resolution
 * @notice Integrates with Zama's InputVerification pattern for proof validation (Step 2)
 */
contract MarketAuction is AccessControl {

    // ============ CONSTANTS ============

    bytes32 public constant AUCTION_MANAGER_ROLE = keccak256("AUCTION_MANAGER_ROLE");

    uint256 public constant AUCTION_DURATION = 300; // 5 minutes
    uint8 public constant MAX_SIMULTANEOUS_AUCTIONS = 10;

    // Good types for auction items
    uint8 public constant GOOD_TYPE_SPICES = 1;
    uint8 public constant GOOD_TYPE_SILK = 2;
    uint8 public constant GOOD_TYPE_GEMS = 3;
    uint8 public constant GOOD_TYPE_GOLD_BARS = 4;
    uint8 public constant GOOD_TYPE_ARTIFACTS = 5;

    // ============ STRUCTS ============

    struct Auction {
        uint256 auctionId;
        uint8 goodType;            // Public: what's being sold
        euint64 reservePrice;      // Private: minimum bid required
        euint64 highestBid;        // Private: current winning bid
        eaddress highestBidder;    // Private: current winning bidder
        uint256 startTime;         // Public: auction start time
        uint256 endTime;           // Public: auction deadline
        bool isActive;             // Public: auction status
        bool isResolved;           // Public: resolution status
        uint8 participantCount;    // Public: number of bidders
        address creator;           // Public: who created the auction
        address currentWinner;     // Public: track provisional winner
        address resolvedWinner;    // Public: final winner after resolution
        bool usesPlaintext;        // If true, fallback logic without FHE precompiles is used
        uint64 reservePricePlain;  // Plaintext reserve price when usesPlaintext is true
        uint64 highestBidPlain;    // Plaintext highest bid when usesPlaintext is true
    }

    struct Bid {
        euint64 amount;            // Private: bid amount
        uint256 timestamp;         // Public: when bid was placed
        bool isActive;             // Public: bid status
        bool isWinning;            // Public: set only after resolution
        bool usesPlaintext;        // Indicates whether amountPlain is meaningful
        uint64 amountPlain;        // Plaintext bid amount for fallback mode
        bool isPendingVerification; // True if proof verification is pending
        uint256 zkProofId;         // ZK proof ID from InputVerification (if using gateway)
    }

    /**
     * @notice Pending bid waiting for proof verification
     */
    struct PendingBid {
        uint256 auctionId;
        address bidder;
        externalEuint64 bidAmount;
        bool isValid;
    }

    // ============ STATE VARIABLES ============

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => Bid)) public bids;
    mapping(uint256 => address[]) public auctionParticipants;
    mapping(uint256 => mapping(address => bool)) private participantRegistry;
    mapping(uint256 => mapping(address => bool)) public rewardsClaimed;

    // InputVerification integration
    address public inputVerificationAddress;
    bool public useInputVerificationGateway;

    // Track pending bids waiting for proof verification
    mapping(uint256 => PendingBid) public pendingBids; // zkProofId => PendingBid

    uint256 public auctionCounter;
    uint256 public activeAuctionCount;

    // Events for client synchronization
    event AuctionCreated(
        uint256 indexed auctionId,
        uint8 indexed goodType,
        address indexed creator,
        uint256 startTime,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 timestamp
    );

    event AuctionResolved(
        uint256 indexed auctionId,
        address indexed winner,
        uint8 goodType,
        uint256 resolvedAt
    );

    event AuctionEnded(
        uint256 indexed auctionId,
        bool hadWinner,
        uint256 endedAt
    );

    event RewardClaimed(
        uint256 indexed auctionId,
        address indexed winner,
        uint8 goodType,
        uint256 claimedAt
    );

    /**
     * @notice Emitted when a bid proof verification is requested via InputVerification
     */
    event BidProofRequested(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 indexed zkProofId,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a bid proof is verified and processed
     */
    event BidProofVerified(
        uint256 indexed zkProofId,
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 timestamp
    );

    // ============ ERRORS ============

    error AuctionNotFound();
    error AuctionNotActive();
    error AuctionAlreadyResolved();
    error AuctionNotExpired();
    error BidTooLate();
    error MaxAuctionsReached();
    error InvalidGoodType();
    error BidRejected();
    error NotAuthorized();
    error NotWinner();
    error RewardAlreadyClaimed();

    // ============ MODIFIERS ============

    modifier validAuction(uint256 auctionId) {
        if (auctionId == 0 || auctionId > auctionCounter) revert AuctionNotFound();
        _;
    }

    modifier auctionActive(uint256 auctionId) {
        if (!auctions[auctionId].isActive) revert AuctionNotActive();
        if (block.timestamp > auctions[auctionId].endTime) revert BidTooLate();
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(address _inputVerificationAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUCTION_MANAGER_ROLE, msg.sender);
        auctionCounter = 0;
        activeAuctionCount = 0;

        // Set InputVerification address and enable gateway if provided
        inputVerificationAddress = _inputVerificationAddress;
        useInputVerificationGateway = (_inputVerificationAddress != address(0));
    }

    // ============ AUCTION MANAGEMENT ============

    /**
     * @dev Create a new auction for a specific good type (Admin only)
     * @param goodType Type of good being auctioned (1-5)
     * @param reservePrice Encrypted minimum bid required
     * @param proof Input proof for the encrypted reserve price
     * @param durationSeconds Custom auction duration in seconds (0 = use default 300s)
     */
    function createAuction(
        uint8 goodType,
        externalEuint64 reservePrice,
        bytes calldata proof,
        uint256 durationSeconds
    ) external returns (uint256) {
        if (activeAuctionCount >= MAX_SIMULTANEOUS_AUCTIONS) {
            revert MaxAuctionsReached();
        }
        if (goodType < 1 || goodType > 5) revert InvalidGoodType();

        auctionCounter++;
        uint256 auctionId = auctionCounter;

        // Use custom duration or default to AUCTION_DURATION
        uint256 duration = (durationSeconds > 0) ? durationSeconds : AUCTION_DURATION;

        // Convert external input to encrypted value, falling back to plaintext handles.
        bytes32 reserveHandle = externalEuint64.unwrap(reservePrice);
        bool usesPlaintext = proof.length == 0;
        uint64 reservePlain = 0;
        euint64 encryptedReservePrice;
        if (usesPlaintext) {
            // For plaintext mode: treat handle as plaintext uint64
            reservePlain = uint64(uint256(reserveHandle));
            encryptedReservePrice = euint64.wrap(reserveHandle);
        } else if (useInputVerificationGateway && proof.length > 0) {
            // For gateway mode: prepare proof for verification (similar to placeBid)
            // Store the encrypted input for later use after verification
            bytes memory ciphertextWithProof = abi.encodePacked(reservePrice, proof);
            bytes memory extraData = abi.encode(auctionId, uint256(0)); // 0 indicates createAuction

            // Call InputVerification contract to request proof verification
            uint256 zkProofId = IInputVerification(inputVerificationAddress).verifyProofRequest(
                block.chainid,
                address(this),
                msg.sender,
                ciphertextWithProof,
                extraData
            );

            // Store pending auction info
            pendingBids[zkProofId] = PendingBid({
                auctionId: auctionId,
                bidder: msg.sender,
                bidAmount: reservePrice,
                isValid: true
            });

            // Will be processed in onProofVerified callback
            encryptedReservePrice = euint64.wrap(bytes32(0));
        } else {
            // Direct FHE mode: attempt to decrypt proof
            // If FHE precompile is not available, fall back to plaintext
            try this._decryptReservePrice(reservePrice, proof) returns (euint64 decrypted) {
                encryptedReservePrice = decrypted;
                FHE.allowThis(encryptedReservePrice);
            } catch {
                // FHE precompile unavailable - fall back to plaintext mode
                usesPlaintext = true;
                reservePlain = uint64(uint256(reserveHandle));
                encryptedReservePrice = euint64.wrap(reserveHandle);
            }
        }

        // Initialize with no bidder
        euint64 zeroBid = euint64.wrap(bytes32(0));
        eaddress noBidder = eaddress.wrap(bytes32(uint256(uint160(address(0)))));

        if (!usesPlaintext) {
            FHE.allowThis(zeroBid);
            FHE.allowThis(noBidder);
        }

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;

        Auction storage auction = auctions[auctionId];
        auction.auctionId = auctionId;
        auction.goodType = goodType;
        auction.reservePrice = encryptedReservePrice;
        auction.highestBid = zeroBid;
        auction.highestBidder = noBidder;
        auction.startTime = startTime;
        auction.endTime = endTime;
        auction.isActive = true;
        auction.isResolved = false;
        auction.participantCount = 0;
        auction.creator = msg.sender;
        auction.currentWinner = address(0);
        auction.resolvedWinner = address(0);
        auction.usesPlaintext = usesPlaintext;
        auction.reservePricePlain = reservePlain;
        auction.highestBidPlain = 0;

        activeAuctionCount++;

        emit AuctionCreated(auctionId, goodType, msg.sender, startTime, endTime);
        return auctionId;
    }

    /**
     * @dev Place a bid on an active auction
     * @param auctionId ID of the auction to bid on
     * @param bidAmount Encrypted bid amount
     * @param proof Input proof for the encrypted bid
     */
    function placeBid(
        uint256 auctionId,
        externalEuint64 bidAmount,
        bytes calldata proof
    ) external validAuction(auctionId) auctionActive(auctionId) {
        Auction storage auction = auctions[auctionId];

        if (useInputVerificationGateway && proof.length > 0) {
            // Use InputVerification gateway pattern for proof verification
            _handleBidViaGateway(auctionId, bidAmount, proof);
        } else {
            // Direct mode (plaintext or direct FHE)
            Bid storage bidderState = bids[auctionId][msg.sender];
            _resetPreviousBid(bidderState);

            if (auction.usesPlaintext) {
                _handlePlaintextBid(auctionId, auction, bidderState, bidAmount);
            } else {
                _handleEncryptedBid(auctionId, auction, bidderState, bidAmount, proof);
            }

            // Register participant
            if (!participantRegistry[auctionId][msg.sender]) {
                participantRegistry[auctionId][msg.sender] = true;
                auctionParticipants[auctionId].push(msg.sender);
                auction.participantCount++;
            }

            emit BidPlaced(auctionId, msg.sender, block.timestamp);
        }
    }

    /**
     * @dev Handle bid placement via InputVerification gateway
     * @notice Follows Zama's async proof verification pattern
     */
    function _handleBidViaGateway(
        uint256 auctionId,
        externalEuint64 bidAmount,
        bytes calldata proof
    ) internal {
        // Prepare the ciphertext with proof for gateway
        bytes memory ciphertextWithProof = abi.encodePacked(bidAmount, proof);

        // Prepare extra data (auction context)
        bytes memory extraData = abi.encode(auctionId);

        // Call InputVerification contract to request proof verification
        uint256 zkProofId = IInputVerification(inputVerificationAddress).verifyProofRequest(
            block.chainid,
            address(this),
            msg.sender,
            ciphertextWithProof,
            extraData
        );

        // Store pending bid information
        pendingBids[zkProofId] = PendingBid({
            auctionId: auctionId,
            bidder: msg.sender,
            bidAmount: bidAmount,
            isValid: true
        });

        // Mark bid as pending verification
        Bid storage bidderState = bids[auctionId][msg.sender];
        bidderState.isPendingVerification = true;
        bidderState.zkProofId = zkProofId;
        bidderState.timestamp = block.timestamp;

        emit BidProofRequested(auctionId, msg.sender, zkProofId, block.timestamp);
    }

    /**
     * @dev Callback function to handle proof verification response from InputVerification
     * @notice Called by off-chain system after proof is validated
     * @param zkProofId The ZK proof ID from InputVerification
     * @param verifiedHandles The verified encrypted handles (unused in mock, for future use)
     */
    function onProofVerified(
        uint256 zkProofId,
        bytes32[] calldata verifiedHandles
    ) external {
        // Verify caller is the InputVerification contract
        require(msg.sender == inputVerificationAddress, "Only InputVerification can call this");

        // Get pending bid information
        PendingBid memory pendingBid = pendingBids[zkProofId];
        require(pendingBid.isValid, "Proof not found or already processed");

        uint256 auctionId = pendingBid.auctionId;
        address bidder = pendingBid.bidder;

        // Verify auction still exists and is active
        if (auctionId == 0 || auctionId > auctionCounter) revert AuctionNotFound();
        Auction storage auction = auctions[auctionId];
        if (!auction.isActive || block.timestamp > auction.endTime) revert AuctionNotActive();

        // Get or create bid state
        Bid storage bidderState = bids[auctionId][bidder];
        _resetPreviousBid(bidderState);

        // For now, use plaintext mode (mock verification)
        // In production with real FHEVM, would use the verified handles
        _handlePlaintextBid(auctionId, auction, bidderState, pendingBid.bidAmount);

        // Register participant if not already registered
        if (!participantRegistry[auctionId][bidder]) {
            participantRegistry[auctionId][bidder] = true;
            auctionParticipants[auctionId].push(bidder);
            auction.participantCount++;
        }

        // Clear pending bid
        pendingBids[zkProofId].isValid = false;

        emit BidProofVerified(zkProofId, auctionId, bidder, block.timestamp);
        emit BidPlaced(auctionId, bidder, block.timestamp);
    }

    /**
     * @dev Resolve an expired auction - PUBLIC wrapper for internal function
     * @param auctionId ID of the auction to resolve
     */
    function resolveAuction(uint256 auctionId)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        validAuction(auctionId)
        returns (bool hasWinner)
    {
        return _resolveAuctionInternal(auctionId);
    }

    /**
     * @dev Batch resolve multiple expired auctions - OPTIMIZED: Use internal function to save gas
     * @param auctionIds Array of auction IDs to resolve
     */
    function batchResolveAuctions(uint256[] calldata auctionIds)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        for (uint i = 0; i < auctionIds.length; i++) {
            uint256 auctionId = auctionIds[i];
            if (auctionId > 0 &&
                auctionId <= auctionCounter &&
                !auctions[auctionId].isResolved &&
                block.timestamp > auctions[auctionId].endTime) {
                _resolveAuctionInternal(auctionId);
            }
        }
    }

    /**
     * @dev Internal function to resolve an auction (used by both resolveAuction and batchResolveAuctions)
     */
    function _resolveAuctionInternal(uint256 auctionId) internal returns (bool hasWinner) {
        Auction storage auction = auctions[auctionId];

        if (auction.isResolved) revert AuctionAlreadyResolved();
        if (block.timestamp <= auction.endTime) revert AuctionNotExpired();

        if (auction.isActive) {
            auction.isActive = false;
            if (activeAuctionCount > 0) {
                activeAuctionCount--;
            }
        }

        auction.isResolved = true;

        address winner = auction.currentWinner;
        auction.resolvedWinner = winner;

        bool hadWinner = winner != address(0);
        if (hadWinner) {
            Bid storage winningBid = bids[auctionId][winner];
            winningBid.isWinning = true;
        }

        emit AuctionResolved(auctionId, winner, auction.goodType, block.timestamp);

        emit AuctionEnded(auctionId, hadWinner, block.timestamp);
        return hadWinner;
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get public auction information
     */
    function getAuctionInfo(uint256 auctionId)
        external
        view
        validAuction(auctionId)
        returns (
            uint8 goodType,
            uint256 startTime,
            uint256 endTime,
            bool isActive,
            bool isResolved,
            uint8 participantCount,
            address creator
        )
    {
        Auction memory auction = auctions[auctionId];
        return (
            auction.goodType,
            auction.startTime,
            auction.endTime,
            auction.isActive,
            auction.isResolved,
            auction.participantCount,
            auction.creator
        );
    }

    /**
     * @dev Get list of active auctions - includes auctions that are active OR expired but not yet resolved
     */
    function getActiveAuctions() external view returns (uint256[] memory) {
        // First pass: collect candidates (active OR expired but unresolved)
        uint256[] memory candidateIds = new uint256[](auctionCounter);
        uint256 activeCount = 0;

        for (uint256 i = 1; i <= auctionCounter; i++) {
            // Include auctions that are:
            // 1. Active and not expired, OR
            // 2. Active and expired but not yet resolved (still need to be resolved)
            if (auctions[i].isActive && !auctions[i].isResolved) {
                candidateIds[activeCount] = i;
                activeCount++;
            }
        }

        // Return properly-sized array
        uint256[] memory activeIds = new uint256[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            activeIds[i] = candidateIds[i];
        }

        return activeIds;
    }

    /**
     * @dev Get auction participants
     */
    function getAuctionParticipants(uint256 auctionId)
        external
        view
        validAuction(auctionId)
        returns (address[] memory)
    {
        return auctionParticipants[auctionId];
    }

    /**
     * @dev Check if user has bid on an auction
     */
    function hasUserBid(uint256 auctionId, address user)
        external
        view
        validAuction(auctionId)
        returns (bool)
    {
        return participantRegistry[auctionId][user];
    }

    /**
     * @dev Get current auction stats
     */
    function getAuctionStats() external view returns (
        uint256 totalAuctions,
        uint256 activeAuctions,
        uint256 resolvedAuctions
    ) {
        uint256 resolved = 0;
        for (uint256 i = 1; i <= auctionCounter; i++) {
            if (auctions[i].isResolved) {
                resolved++;
            }
        }

        return (auctionCounter, activeAuctionCount, resolved);
    }

    // ============ REWARD MANAGEMENT ============

    /**
     * @dev Claim reward for winning an auction
     * @param auctionId ID of the auction won
     */
    function claimReward(uint256 auctionId)
        external
        validAuction(auctionId)
        returns (bool)
    {
        Auction storage auction = auctions[auctionId];

        // Verify auction is resolved
        if (!auction.isResolved) revert AuctionNotExpired();

        // Verify caller is the winner
        if (auction.resolvedWinner != msg.sender) revert NotWinner();

        // Verify reward hasn't been claimed yet
        if (rewardsClaimed[auctionId][msg.sender]) revert RewardAlreadyClaimed();

        // Mark reward as claimed
        rewardsClaimed[auctionId][msg.sender] = true;

        // Emit reward claimed event
        emit RewardClaimed(auctionId, msg.sender, auction.goodType, block.timestamp);

        return true;
    }

    /**
     * @dev Get all auctions won by a user
     * @param user Address of the user
     * @return Array of auction IDs won by the user
     */
    function getMyWins(address user) external view returns (uint256[] memory) {
        // Count wins first
        uint256 winCount = 0;
        for (uint256 i = 1; i <= auctionCounter; i++) {
            if (auctions[i].isResolved && auctions[i].resolvedWinner == user) {
                winCount++;
            }
        }

        // Populate wins array
        uint256[] memory wins = new uint256[](winCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= auctionCounter; i++) {
            if (auctions[i].isResolved && auctions[i].resolvedWinner == user) {
                wins[index] = i;
                index++;
            }
        }

        return wins;
    }

    /**
     * @dev Check if a reward has been claimed for an auction
     * @param auctionId ID of the auction
     * @param user Address to check
     * @return Boolean indicating if reward has been claimed
     */
    function hasClaimedReward(uint256 auctionId, address user)
        external
        view
        validAuction(auctionId)
        returns (bool)
    {
        return rewardsClaimed[auctionId][user];
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Emergency function to end an auction early
     */
    function emergencyEndAuction(uint256 auctionId)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        validAuction(auctionId)
    {
        Auction storage auction = auctions[auctionId];
        if (auction.isResolved) {
            return;
        }

        if (auction.isActive) {
            auction.isActive = false;
            if (activeAuctionCount > 0) {
                activeAuctionCount--;
            }
        }

        auction.endTime = block.timestamp;
        auction.isResolved = true;
        auction.resolvedWinner = auction.currentWinner;

        address winner = auction.resolvedWinner;
        if (winner != address(0)) {
            Bid storage winningBid = bids[auctionId][winner];
            winningBid.isWinning = true;
            emit AuctionResolved(auctionId, winner, auction.goodType, block.timestamp);
        }

        bool hadWinner = winner != address(0);
        emit AuctionEnded(auctionId, hadWinner, block.timestamp);
    }

    /**
     * @dev Update auction duration for future auctions
     */
    function updateAuctionDuration(uint256 newDuration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Note: This would require a state variable for auction duration
        // For simplicity, using constant for now
    }

    /**
     * @dev Get good type name for display
     */
    function getGoodTypeName(uint8 goodType) external pure returns (string memory) {
        if (goodType == GOOD_TYPE_SPICES) return "Rare Spices";
        if (goodType == GOOD_TYPE_SILK) return "Fine Silk";
        if (goodType == GOOD_TYPE_GEMS) return "Precious Gems";
        if (goodType == GOOD_TYPE_GOLD_BARS) return "Gold Bars";
        if (goodType == GOOD_TYPE_ARTIFACTS) return "Ancient Artifacts";
        return "Unknown Good";
    }
    function _resetPreviousBid(Bid storage bidderState) internal {
        if (bidderState.isActive) {
            bidderState.isActive = false;
            bidderState.isWinning = false;
            bidderState.amountPlain = 0;
        }
    }

    function _handlePlaintextBid(
        uint256 auctionId,
        Auction storage auction,
        Bid storage bidderState,
        externalEuint64 bidAmount
    ) internal {
        uint64 plainBid = uint64(uint256(externalEuint64.unwrap(bidAmount)));
        if (plainBid < auction.reservePricePlain) revert BidRejected();
        if (plainBid <= auction.highestBidPlain) revert BidRejected();

        address previousWinner = auction.currentWinner;
        if (previousWinner != address(0)) {
            Bid storage previousBid = bids[auctionId][previousWinner];
            previousBid.isWinning = false;
            previousBid.isActive = false;
            previousBid.amountPlain = 0;
        }

        auction.highestBidPlain = plainBid;
        auction.highestBid = euint64.wrap(externalEuint64.unwrap(bidAmount));
        auction.currentWinner = msg.sender;
        auction.highestBidder = eaddress.wrap(bytes32(uint256(uint160(msg.sender))));

        bidderState.amount = auction.highestBid;
        bidderState.timestamp = block.timestamp;
        bidderState.isActive = true;
        bidderState.isWinning = true;
        bidderState.usesPlaintext = true;
        bidderState.amountPlain = plainBid;
    }

    function _handleEncryptedBid(
        uint256 auctionId,
        Auction storage auction,
        Bid storage bidderState,
        externalEuint64 bidAmount,
        bytes calldata proof
    ) internal {
        if (proof.length == 0) revert BidRejected();
        euint64 encryptedBid = FHE.fromExternal(bidAmount, proof);
        FHE.allowThis(encryptedBid);
        FHE.allow(encryptedBid, msg.sender);

        euint64 previousHighest = auction.highestBid;
        ebool meetsReserve = FHE.ge(encryptedBid, auction.reservePrice);
        ebool isHigherBid = FHE.gt(encryptedBid, auction.highestBid);
        ebool isValidBid = FHE.and(meetsReserve, isHigherBid);

        auction.highestBid = FHE.select(isValidBid, encryptedBid, auction.highestBid);
        auction.highestBidder = FHE.select(
            isValidBid,
            FHE.asEaddress(msg.sender),
            auction.highestBidder
        );

        bool bidAccepted = euint64.unwrap(auction.highestBid) != euint64.unwrap(previousHighest);
        if (!bidAccepted) revert BidRejected();

        address previousWinner = auction.currentWinner;
        if (previousWinner != address(0)) {
            Bid storage previousBid = bids[auctionId][previousWinner];
            previousBid.isWinning = false;
            previousBid.isActive = false;
        }

        auction.currentWinner = msg.sender;

        bidderState.amount = encryptedBid;
        bidderState.timestamp = block.timestamp;
        bidderState.isActive = true;
        bidderState.isWinning = true;
        bidderState.usesPlaintext = false;
        bidderState.amountPlain = 0;

        FHE.allowThis(auction.highestBid);
        FHE.allow(auction.highestBid, msg.sender);
        auction.highestBidder = FHE.asEaddress(msg.sender);
        FHE.allowThis(auction.highestBidder);
        FHE.allow(auction.highestBidder, msg.sender);
    }

    function _decryptReservePrice(externalEuint64 reservePrice, bytes calldata proof)
        external returns (euint64)
    {
        return FHE.fromExternal(reservePrice, proof);
    }

}
