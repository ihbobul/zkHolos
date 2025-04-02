import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VoterRegistration } from "../typechain-types";
import { deployContracts, registerVoter, TestContracts } from "./utils/testUtils";

describe("VoterRegistration", function () {
  let contracts: TestContracts;
  let owner: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();
    contracts = await deployContracts(owner);
  });

  it("Should register voters correctly", async function () {
    await registerVoter(contracts.voterRegistration, owner, voter1, "Kyiv");
    await registerVoter(contracts.voterRegistration, owner, voter2, "Lviv");

    const voter1Info = await contracts.voterRegistration.getVoterInfo(voter1.address);
    const voter2Info = await contracts.voterRegistration.getVoterInfo(voter2.address);

    expect(voter1Info[0]).to.be.true; // isRegistered
    expect(voter1Info[1]).to.be.true; // isEligible
    expect(voter2Info[0]).to.be.true; // isRegistered
    expect(voter2Info[1]).to.be.true; // isEligible
  });

  it("Should not allow duplicate registration", async function () {
    await registerVoter(contracts.voterRegistration, owner, voter1, "Kyiv");
    await expect(
      registerVoter(contracts.voterRegistration, owner, voter1, "Kyiv")
    ).to.be.revertedWith("Voter already registered");
  });

  it("Should update voter region correctly", async function () {
    await registerVoter(contracts.voterRegistration, owner, voter1, "Kyiv");
    await contracts.voterRegistration.connect(owner).updateVoterRegion(voter1.address, "Lviv");

    const voterInfo = await contracts.voterRegistration.getVoterInfo(voter1.address);
    expect(voterInfo[2]).to.equal("Lviv"); // region
  });

  it("Should update voter eligibility correctly", async function () {
    await registerVoter(contracts.voterRegistration, owner, voter1, "Kyiv");
    await contracts.voterRegistration.connect(owner).updateVoterEligibility(voter1.address, false);

    const voterInfo = await contracts.voterRegistration.getVoterInfo(voter1.address);
    expect(voterInfo[1]).to.be.false; // isEligible
  });

  it("Should remove voter correctly", async function () {
    await registerVoter(contracts.voterRegistration, owner, voter1, "Kyiv");
    await contracts.voterRegistration.connect(owner).removeVoter(voter1.address);

    const voterInfo = await contracts.voterRegistration.getVoterInfo(voter1.address);
    expect(voterInfo[0]).to.be.false; // isRegistered
  });

  it("Should track region voter counts correctly", async function () {
    await registerVoter(contracts.voterRegistration, owner, voter1, "Kyiv");
    await registerVoter(contracts.voterRegistration, owner, voter2, "Kyiv");
    await registerVoter(contracts.voterRegistration, owner, voter3, "Lviv");

    expect(await contracts.voterRegistration.getRegionVoterCount("Kyiv")).to.equal(2);
    expect(await contracts.voterRegistration.getRegionVoterCount("Lviv")).to.equal(1);
  });
}); 