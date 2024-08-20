import { ethers } from "ethers";
import FACTORY_ABI from "./abis/factory.json" with { type: "json" };
import SWAP_ROUTER_ABI from "./abis/swaprouter.json" with { type: "json" };
import POOL_ABI from "./abis/pool.json" with { type: "json" };
import TOKEN_IN_ABI from "./abis/token.json" with { type: "json" };
import AAVE_LENDING_POOL_ABI from "./abis/aaveLendingPool.json" with { type: "json" }; 

import dotenv from "dotenv";
dotenv.config();

const POOL_FACTORY_CONTRACT_ADDRESS =
  "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
const SWAP_ROUTER_CONTRACT_ADDRESS =
  "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
const AAVE_LENDING_POOL_ADDRESS = 
  "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const factoryContract = new ethers.Contract(
  POOL_FACTORY_CONTRACT_ADDRESS,
  FACTORY_ABI,
  provider
);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Tokens configuration
const USDC = {
  chainId: 11155111,
  address: "0x9xxxxxxxxxxxxxxxxxxxxxxx", // Your USDC Address
  decimals: 6,
  symbol: "USDC",
  name: "USD//C",
  isToken: true,
  isNative: true,
  wrapped: false,
};

const LINK = {
  chainId: 11155111,
  address: "0xbxxxxxxxxxxxxxxxxxxxxxxx", // Your LINK Address
  decimals: 18,
  symbol: "LINK",
  name: "Chainlink",
  isToken: true,
  isNative: true,
  wrapped: false,
};

// Function to get the balance of a token for the signer
async function getTokenBalance(tokenAddress, tokenABI, walletAddress) {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
    const balance = await tokenContract.balanceOf(walletAddress);
    return ethers.formatUnits(balance, LINK.decimals);
  }
  
// Function to get the total supply of a token
async function getTokenTotalSupply(tokenAddress, tokenABI) {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
    const totalSupply = await tokenContract.totalSupply();
    return ethers.formatUnits(totalSupply, LINK.decimals);
  }

// Approve Token Function
async function approveToken(tokenAddress, tokenABI, amount, wallet, spender) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), USDC.decimals);
    const approveTransaction = await tokenContract.approve.populateTransaction(
      spender,
      approveAmount
    );
    const transactionResponse = await wallet.sendTransaction(approveTransaction);
    console.log(`-------------------------------`);
    console.log(`Sending Approval Transaction...`);
    console.log(`-------------------------------`);
    console.log(`Transaction Sent: ${transactionResponse.hash}`);
    console.log(`-------------------------------`);
    const receipt = await transactionResponse.wait();
    console.log(
      `Approval Transaction Confirmed! https://sepolia.etherscan.io/tx/${receipt.hash}`
    );
  } catch (error) {
    console.error("An error occurred during token approval:", error);
    throw new Error("Token approval failed");
  }
}

// Get Pool Info Function
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
  const poolAddress = await factoryContract.getPool(
    tokenIn.address,
    tokenOut.address,
    3000
  );
  if (!poolAddress) {
    throw new Error("Failed to get pool address");
  }
  const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);
  return { poolContract, token0, token1, fee };
}

// Prepare Swap Params Function 
async function prepareSwapParams(poolContract, signer, amountIn) {
  return {
    tokenIn: USDC.address,
    tokenOut: LINK.address,
    fee: await poolContract.fee(),
    recipient: signer.address,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };
}

// Execute Swap Function 
async function executeSwap(swapRouter, params, signer) {
  const transaction = await swapRouter.exactInputSingle.populateTransaction(
    params
  );
  const receipt = await signer.sendTransaction(transaction);
  console.log(`-------------------------------`);
  console.log(`Swap Transaction Completed: https://sepolia.etherscan.io/tx/${receipt.hash}`);
  console.log(`-------------------------------`);
}

// Deposit LINK into Aave to Earn Interest Function
async function depositToAave(amountToDeposit) {
  const aaveLendingPool = new ethers.Contract(AAVE_LENDING_POOL_ADDRESS, AAVE_LENDING_POOL_ABI, signer);
  
  try {
    // Approve Aave to transfer LINK
    await approveToken(LINK.address, TOKEN_IN_ABI, amountToDeposit, signer, AAVE_LENDING_POOL_ADDRESS);
    
    // Deposit LINK into Aave Lending Pool
    const tx = await aaveLendingPool.deposit(LINK.address, amountToDeposit, signer.address, 0);
    const receipt = await tx.wait();
    console.log(`-------------------------------`);
    console.log(`LINK Deposited into Aave: https://sepolia.etherscan.io/tx/${receipt.hash}`);
    console.log(`-------------------------------`);
  } catch (error) {
    console.error("An error occurred while depositing to Aave:", error);
  }
}

// Main Function - Expanded to Include Aave Deposit
async function main(swapAmount) {
    const inputAmount = swapAmount;
    const amountIn = ethers.parseUnits(inputAmount.toString(), USDC.decimals);
    
    try {
      // Display initial balances
      console.log('-------------------------------');
      console.log(`Initial LINK Balance: ${await getTokenBalance(LINK.address, TOKEN_IN_ABI, signer.address)}`);
      console.log('-------------------------------');
      
      // Approve and Swap USDC for LINK
      await approveToken(USDC.address, TOKEN_IN_ABI, inputAmount, signer, SWAP_ROUTER_CONTRACT_ADDRESS);
      const { poolContract } = await getPoolInfo(factoryContract, USDC, LINK);
      const params = await prepareSwapParams(poolContract, signer, amountIn);
      const swapRouter = new ethers.Contract(
        SWAP_ROUTER_CONTRACT_ADDRESS,
        SWAP_ROUTER_ABI,
        signer
      );
      await executeSwap(swapRouter, params, signer);
  
      // Deposit LINK to Aave to Earn Interest
      const amountToDeposit = ethers.parseUnits("1", LINK.decimals); // Example: Deposit 1 LINK
      await depositToAave(amountToDeposit);
  
      // Display final balances after deposit
      console.log('-------------------------------');
      console.log(`LINK Balance After Aave Deposit: ${await getTokenBalance(LINK.address, TOKEN_IN_ABI, signer.address)}`);
      console.log('-------------------------------');
  
    } catch (error) {
      console.error("An error occurred:", error.message);
    }
  }
  
  // Enter Swap Amount and Execute
  main(1);
