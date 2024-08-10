const { assert, expect } = require("chai");
const { getAddress, Contract } = require("ethers");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", function () {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.parseEther("1");
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        const contracts = await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = contracts["MockV3Aggregator"];
      });

      describe("constructor", function () {
        it("sets the aggregator addresses correctly", async () => {
          const response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", function () {
        // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
        // could also do assert.fail
        it("Fails if you don't send enough ETH", async () => {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });
        it("update the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.getAddressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });
        it("Adds funder to array of funders", async function () {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.getFunder(0);
          assert.equal(funder, deployer);
        });
      });

      describe("withdraw", function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });
        it("Withdraw ETH from a single founder", async function () {
          //Arrange
          const startingFundMeBalance = await ethers.provider.getBalance(
            fundMe.getAddress()
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          //Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, gasPrice, fee } = transactionReceipt;
          const endingFundMeBalance = await ethers.provider.getBalance(
            fundMe.getAddress()
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          //gascost
          const gasCost = gasPrice * gasUsed;
          //Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            (startingFundMeBalance + startingDeployerBalance).toString(),
            (endingDeployerBalance + gasCost).toString()
          );
        });
        it("allow us to withdraw with multiple funders", async function () {
          //Arrange
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await ethers.provider.getBalance(
            fundMe.getAddress()
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          //Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, gasPrice, fee } = transactionReceipt;
          const gasCost = gasPrice * gasUsed;
          const endingFundMeBalance = await ethers.provider.getBalance(
            fundMe.getAddress()
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          //Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            (startingFundMeBalance + startingDeployerBalance).toString(),
            (endingDeployerBalance + gasCost).toString()
          );
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("Only allows the owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attackerConnectedContract = await fundMe.connect(accounts[1]);
          await expect(
            attackerConnectedContract.withdraw()
          ).to.be.revertedWithCustomError(
            attackerConnectedContract,
            "FundMe__NotOwner"
          );
        });

        it("cheaperWithdraw testing", async function () {
          //Arrange
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await ethers.provider.getBalance(
            fundMe.getAddress()
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          //Act
          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, gasPrice, fee } = transactionReceipt;
          const gasCost = gasPrice * gasUsed;
          const endingFundMeBalance = await ethers.provider.getBalance(
            fundMe.getAddress()
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          //Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            (startingFundMeBalance + startingDeployerBalance).toString(),
            (endingDeployerBalance + gasCost).toString()
          );
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("cheaperWithdraw testing single", async function () {
          //Arrange
          const startingFundMeBalance = await ethers.provider.getBalance(
            fundMe.getAddress()
          );
          const startingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          //Act
          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, gasPrice, fee } = transactionReceipt;
          const endingFundMeBalance = await ethers.provider.getBalance(
            fundMe.getAddress()
          );
          const endingDeployerBalance = await ethers.provider.getBalance(
            deployer
          );
          //gascost
          const gasCost = gasPrice * gasUsed;
          //Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            (startingFundMeBalance + startingDeployerBalance).toString(),
            (endingDeployerBalance + gasCost).toString()
          );
        });
      });
    });
