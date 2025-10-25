const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("MarketAuction", function () {
  const toHandle = (value) => "0x" + BigInt(value).toString(16).padStart(64, "0");

  async function deployAuction() {
    const factory = await ethers.getContractFactory("MarketAuction");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return contract;
  }

  it("creates auctions using plaintext reserve fallback when no proof is provided", async function () {
    const [deployer] = await ethers.getSigners();
    const auction = await deployAuction();

    const reserveHandle = toHandle(500n);

    await expect(auction.createAuction(1, reserveHandle, "0x"))
      .to.emit(auction, "AuctionCreated")
      .withArgs(1, 1, deployer.address, anyValue, anyValue);

    const storedAuction = await auction.auctions(1);
    expect(storedAuction.usesPlaintext).to.equal(true);
    expect(storedAuction.reservePricePlain).to.equal(500n);
    expect(storedAuction.highestBidPlain).to.equal(0);
  });

  it("accepts plaintext bids and resolves highest bidder correctly", async function () {
    const [, bidder1, bidder2] = await ethers.getSigners();
    const auction = await deployAuction();

    await auction.createAuction(1, toHandle(100n), "0x");

    await auction.connect(bidder1).placeBid(1, toHandle(200n), "0x");
    await auction.connect(bidder2).placeBid(1, toHandle(300n), "0x");

    const storedAuction = await auction.auctions(1);
    expect(storedAuction.currentWinner).to.equal(bidder2.address);
    expect(storedAuction.highestBidPlain).to.equal(300n);

    await ethers.provider.send("evm_increaseTime", [301]);
    await ethers.provider.send("evm_mine");

    const result = await auction.resolveAuction(1);
    await expect(result)
      .to.emit(auction, "AuctionResolved")
      .withArgs(1, bidder2.address, 1, anyValue);
  });
});
