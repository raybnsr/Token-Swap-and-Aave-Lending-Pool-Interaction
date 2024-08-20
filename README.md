# DeFi Token Swap and Aave Deposit Script

## Overview of the Project

This project is a DeFi script that automates the process of swapping tokens using the Uniswap V3 protocol and subsequently depositing the swapped tokens into the Aave lending protocol to earn interest. The script is designed to run on the Ethereum Sepolia testnet and interacts with the following DeFi protocols:

1. **Uniswap V3**: For swapping USDC to LINK.
2. **Aave Lending Pool**: For depositing LINK to earn interest.

### Workflow

1. **Token Approval**: The script first approves the Uniswap V3 router to spend the specified amount of USDC on behalf of the user.
2. **Token Swap**: It then swaps the approved USDC for LINK using Uniswap V3.
3. **Aave Deposit**: After the swap, the script deposits the acquired LINK into the Aave lending pool to start earning interest.

## Diagram Illustration

The following diagram illustrates the sequence of interactions between the script and the DeFi protocols:

![Token swap](https://github.com/user-attachments/assets/267a5cc5-de33-48bc-b137-6e28db84c0e0)

## Code Explanation

1. **Token Configuration**: The script defines the tokens involved in the swap
```javascript
const USDC = {
  chainId: 11155111,
  address: "0x9xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  decimals: 6,
  symbol: "USDC",
  name: "USD//C",
};

const LINK = {
  chainId: 11155111,
  address: "0xfxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  decimals: 18,
  symbol: "LINK",
  name: "Chainlink",
};
```
These objects contain essential information about USDC and LINK, including their contract addresses and decimal values.


2. **Approve Token Function**: The approveToken function allows Uniswap to spend the specified amount of USDC
```javascript
async function approveToken(tokenAddress, tokenABI, amount, wallet, spender) {
  const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
  const approveAmount = ethers.parseUnits(amount.toString(), USDC.decimals);
  const approveTransaction = await tokenContract.approve.populateTransaction(
    spender,
    approveAmount
  );
  const transactionResponse = await wallet.sendTransaction(approveTransaction);
  const receipt = await transactionResponse.wait();
}

```
This function is crucial for ensuring that Uniswap has permission to spend the tokens before attempting the swap.


3. **Token Swap Function**: The executeSwap function handles the swapping of USDC for LINK on Uniswap V3
```javascript
async function executeSwap(swapRouter, params, signer) {
  const transaction = await swapRouter.exactInputSingle.populateTransaction(
    params
  );
  const receipt = await signer.sendTransaction(transaction);
}
```
This function executes the token swap by interacting with the Uniswap V3 router.


4. **Deposit to Aave Function**: The depositToAave function deposits the swapped LINK into Aave to start earning interest
```javascript
async function depositToAave(amountToDeposit) {
  const aaveLendingPool = new ethers.Contract(AAVE_LENDING_POOL_ADDRESS, AAVE_LENDING_POOL_ABI, signer);
  
  await approveToken(LINK.address, TOKEN_IN_ABI, amountToDeposit, signer, AAVE_LENDING_POOL_ADDRESS);
  
  const tx = await aaveLendingPool.deposit(LINK.address, amountToDeposit, signer.address, 0);
  const receipt = await tx.wait();
}
```
This function first approves the Aave lending pool to spend LINK and then deposits the tokens to earn interest.


5. **Main Execution Function**: The main function ties together the entire workflow
```javascript
async function main(swapAmount) {
    const inputAmount = swapAmount;
    const amountIn = ethers.parseUnits(inputAmount.toString(), USDC.decimals);

    console.log(`Initial LINK Balance: ${await getTokenBalance(LINK.address, TOKEN_IN_ABI, signer.address)}`);

    await approveToken(USDC.address, TOKEN_IN_ABI, inputAmount, signer, SWAP_ROUTER_CONTRACT_ADDRESS);
    const { poolContract } = await getPoolInfo(factoryContract, USDC, LINK);
    const params = await prepareSwapParams(poolContract, signer, amountIn);
    const swapRouter = new ethers.Contract(SWAP_ROUTER_CONTRACT_ADDRESS, SWAP_ROUTER_ABI, signer);
    await executeSwap(swapRouter, params, signer);

    console.log(`LINK Balance After Swap: ${await getTokenBalance(LINK.address, TOKEN_IN_ABI, signer.address)}`);

    const amountToDeposit = ethers.parseUnits("1", LINK.decimals);
    await depositToAave(amountToDeposit);

    console.log(`LINK Balance After Aave Deposit: ${await getTokenBalance(LINK.address, TOKEN_IN_ABI, signer.address)}`);
}
```
This function handles the overall logic, including token approval, swapping, and depositing into Aave.


## Setup Instruction
### Prerequisites
1. Node.js
2. npm or yarn
3. An Ethereum wallet with Sepolia testnet funds
4. Infura or Alchemy account for RPC URL


## Installation
### Clone the repository:
```bash
git clone https://github.com/yourusername/your-repo-name.git
```

### Navigate to the project directory:
```bash
cd your-repo-name
```

### Install dependencies:
```bash
npm install
```

### Create a .env file:
```.env
RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"
PRIVATE_KEY="your_private_key_here"
```

### Run the script:
```bash
node index.js
```

### Instructions:
- Replace `yourusername` and `your-repo-name` with your actual GitHub username and repository name.
- Ensure that the `.env` file is correctly set up with your Infura or Alchemy credentials and private key before running the script.
- Make sure the repository is organized.
