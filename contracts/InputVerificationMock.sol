// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.24;

/**
 * @title InputVerificationMock
 * @dev Mock implementation of InputVerification for testing on Sepolia
 * Follows Zama's pattern for proof verification
 */
contract InputVerificationMock {
    /**
     * @notice Emitted when a proof verification request is made
     */
    event VerifyProofRequest(
        uint256 indexed zkProofId,
        uint256 indexed contractChainId,
        address indexed contractAddress,
        address userAddress,
        bytes ciphertextWithZKProof,
        bytes extraData
    );

    /**
     * @notice Emitted when a proof verification response is ready
     */
    event VerifyProofResponse(
        uint256 indexed zkProofId,
        bytes32[] ctHandles,
        bytes[] signatures
    );

    /**
     * @notice Emitted when a proof is rejected
     */
    event RejectProofResponse(uint256 indexed zkProofId);

    // Counter for ZK proof IDs
    uint256 public zkProofIdCounter = 0;

    // Track pending proof verification requests
    struct ProofRequest {
        uint256 contractChainId;
        address contractAddress;
        address userAddress;
        bytes ciphertextWithZKProof;
        bytes extraData;
    }

    // Map zkProofId to its request
    mapping(uint256 => ProofRequest) public proofRequests;

    /**
     * @notice Submit a proof verification request
     * @param contractChainId The chain ID of the requesting contract
     * @param contractAddress The address of the requesting contract
     * @param userAddress The user address that submitted the proof
     * @param ciphertextWithZKProof The encrypted input with ZK proof
     * @param extraData Optional extra data (e.g., auction ID, bid amount)
     */
    function verifyProofRequest(
        uint256 contractChainId,
        address contractAddress,
        address userAddress,
        bytes calldata ciphertextWithZKProof,
        bytes calldata extraData
    ) external returns (uint256 zkProofId) {
        zkProofIdCounter++;
        zkProofId = zkProofIdCounter;

        // Store the proof request
        proofRequests[zkProofId] = ProofRequest(
            contractChainId,
            contractAddress,
            userAddress,
            ciphertextWithZKProof,
            extraData
        );

        // Emit the verification request event
        // Off-chain coprocessor would listen to this event
        emit VerifyProofRequest(
            zkProofId,
            contractChainId,
            contractAddress,
            userAddress,
            ciphertextWithZKProof,
            extraData
        );

        return zkProofId;
    }

    /**
     * @notice Submit a proof verification response (called by off-chain coprocessor)
     * In mock mode, this immediately approves the proof
     * In production, this would contain actual signatures from coprocessors
     */
    function verifyProofResponse(
        uint256 zkProofId,
        bytes32[] calldata ctHandles,
        bytes calldata signature,
        bytes calldata extraData
    ) external {
        require(zkProofId > 0 && zkProofId <= zkProofIdCounter, "Invalid zkProofId");

        ProofRequest storage request = proofRequests[zkProofId];
        bytes[] memory signatures = new bytes[](1);
        signatures[0] = signature;

        // Emit response event for the dApp contract to listen
        emit VerifyProofResponse(zkProofId, ctHandles, signatures);
    }

    /**
     * @notice Reject a proof verification (called by off-chain coprocessor)
     */
    function rejectProofResponse(uint256 zkProofId, bytes calldata /* unusedVariable */) external {
        require(zkProofId > 0 && zkProofId <= zkProofIdCounter, "Invalid zkProofId");

        emit RejectProofResponse(zkProofId);
    }

    /**
     * @notice Get a proof request (for debugging/inspection)
     */
    function getProofRequest(uint256 zkProofId) external view returns (ProofRequest memory) {
        return proofRequests[zkProofId];
    }
}
