"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
describe("ShadowMerchants (local)", function () {
    async function deployShadowMerchants() {
        const factory = await hardhat_1.ethers.getContractFactory("ShadowMerchants");
        const contract = await factory.deploy();
        await contract.waitForDeployment();
        return contract;
    }
    it("allows the game manager to start and end a game", async function () {
        const contract = await deployShadowMerchants();
        const initialState = await contract.gameState();
        (0, chai_1.expect)(initialState.gameActive).to.equal(false);
        await (0, chai_1.expect)(contract.startGame()).to.not.be.reverted;
        const startedState = await contract.gameState();
        (0, chai_1.expect)(startedState.gameActive).to.equal(true);
        (0, chai_1.expect)(startedState.currentRound).to.equal(1);
        await (0, chai_1.expect)(contract.endGame()).to.not.be.reverted;
        const endedState = await contract.gameState();
        (0, chai_1.expect)(endedState.gameActive).to.equal(false);
        (0, chai_1.expect)(endedState.gameEnded).to.equal(true);
        (0, chai_1.expect)(endedState.winner).to.equal(hardhat_1.ethers.ZeroAddress);
    });
    it("restricts startGame to the manager role", async function () {
        const [, nonManager] = await hardhat_1.ethers.getSigners();
        const contract = await deployShadowMerchants();
        const role = await contract.GAME_MANAGER_ROLE();
        await (0, chai_1.expect)(contract.connect(nonManager).startGame())
            .to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount")
            .withArgs(nonManager.address, role);
    });
    it("grants the auction role to the MarketAuction contract", async function () {
        const contract = await deployShadowMerchants();
        const auctionFactory = await hardhat_1.ethers.getContractFactory("MarketAuction");
        const auction = await auctionFactory.deploy();
        await auction.waitForDeployment();
        const auctionAddress = await auction.getAddress();
        await (0, chai_1.expect)(contract.grantAuctionRole(auctionAddress)).to.not.be.reverted;
        const role = await contract.AUCTION_ROLE();
        (0, chai_1.expect)(await contract.hasRole(role, auctionAddress)).to.equal(true);
    });
});
//# sourceMappingURL=shadowMerchants.spec.js.map