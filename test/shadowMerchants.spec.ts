import { expect } from "chai";
import { ethers } from "hardhat";

describe("ShadowMerchants (local)", function () {
  async function deployShadowMerchants() {
    const factory = await ethers.getContractFactory("ShadowMerchants");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  it("allows the game manager to start and end a game", async function () {
    const contract = await deployShadowMerchants();

    const initialState = await contract.gameState();
    expect(initialState.gameActive).to.equal(false);

    await expect(contract.startGame()).to.not.be.reverted;

    const startedState = await contract.gameState();
    expect(startedState.gameActive).to.equal(true);
    expect(startedState.currentRound).to.equal(1);

    await expect(contract.endGame()).to.not.be.reverted;

    const endedState = await contract.gameState();
    expect(endedState.gameActive).to.equal(false);
    expect(endedState.gameEnded).to.equal(true);
    expect(endedState.winner).to.equal(ethers.ZeroAddress);
  });

  it("restricts startGame to the manager role", async function () {
    const [, nonManager] = await ethers.getSigners();
    const contract = await deployShadowMerchants();
    const role = await contract.GAME_MANAGER_ROLE();

    await expect(contract.connect(nonManager).startGame())
      .to.be.revertedWithCustomError(contract, "AccessControlUnauthorizedAccount")
      .withArgs(nonManager.address, role);
  });

  it("grants the auction role to the MarketAuction contract", async function () {
    const contract = await deployShadowMerchants();
    const auctionFactory = await ethers.getContractFactory("MarketAuction");
    const auction = await auctionFactory.deploy();
    await auction.waitForDeployment();

    const auctionAddress = await auction.getAddress();

    await expect(contract.grantAuctionRole(auctionAddress)).to.not.be.reverted;

    const role = await contract.AUCTION_ROLE();
    expect(await contract.hasRole(role, auctionAddress)).to.equal(true);
  });
});
