import { Wallet as EthSigner, Contract as ETHContract } from "ethers";
import { BridgeAssets } from "./types";
import Arweave from "arweave";
import { result } from "@permaweb/aoconnect";

interface BridgeConfig {
  MININUM_ARWEAVE_BRIDGE: string;
  MININUM_USDC_BRIDGE: string;
}

interface ArweaveMintOptions {
  asset: BridgeAssets.vAR;
  amount: string;
  destinationAddress: string;
}

interface ERC20MintOptions {
  asset: BridgeAssets.vUSDC;
  amount: string;
  destinationAddress: string;
  includeApproval?: boolean;
}

const ARWEAVE_BRIDGE_ADDRESS = "mFRKcHsO6Tlv2E2wZcrcbv3mmzxzD7vYPbyybI3KCVA";
const ETH_BRIDGE_CONTRACT_ADDRESS =
  "0xf26d9D9EaB2d61ED3F266BEddEAeABaE9aB314ff";
const AO_TOKENS = {
  [BridgeAssets.vAR]: "y-p7CPhs6JMUStAuE4KeTnMXN7qYBvEi2hiBFk8ZhjM",
  [BridgeAssets.vUSDC]: "cxkFiGP89fEKOvbvl9SLs1lEaw0L-DWJiqQOuDPeDG8",
};
const ETH_TOKENS = {
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

export class VentoBridge {
  private ethSigner?: EthSigner;
  private aoSigner?: any;
  private arweaveWallet?: any;
  private arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  constructor({
    ethSigner,
    aoSigner,
    arweaveWallet,
  }: {
    ethSigner?: EthSigner;
    aoSigner?: any;
    arweaveWallet?: any;
  }) {
    this.ethSigner = ethSigner;
    this.aoSigner = aoSigner;
    this.arweaveWallet = arweaveWallet;
  }

  async burn({
    asset,
    amount,
    destinationAddress,
  }: {
    asset: BridgeAssets.vAR;
    amount: string;
    destinationAddress: string;
  }) {
    const config = await this.getBridgeConfig();
    const minAmount = BigInt(
      asset === BridgeAssets.vAR
        ? config.MININUM_ARWEAVE_BRIDGE
        : config.MININUM_USDC_BRIDGE
    );
    if (BigInt(amount) < minAmount) {
      throw new Error(
        `Minimum bridge amount is ${minAmount} AR, ${amount} AR provided`
      );
    }
    if (asset === BridgeAssets.vAR) {
      if (!isValidArweaveAddress(destinationAddress)) {
        throw new Error("Destination address is not a valid Arweave address");
      }
      return this.burnAOAsset(
        amount,
        destinationAddress,
        AO_TOKENS[BridgeAssets.vAR]
      );
    }

    if (asset === BridgeAssets.vUSDC) {
      if (!isValidEthereumAddress(destinationAddress)) {
        throw new Error("Destination address is not a valid Ethereum address");
      }
      return this.burnAOAsset(
        amount,
        destinationAddress,
        AO_TOKENS[BridgeAssets.vUSDC]
      );
    }
  }

  private async burnAOAsset(
    amount: string,
    destinationAddress: string,
    tokenAddress: string
  ) {
    const { message } = await import("@permaweb/aoconnect");
    if (!this.aoSigner) {
      throw new Error("No ao signer provided in config");
    }
    const balanceMessage = await message({
      process: tokenAddress,
      signer: this.aoSigner,
      data: "",
      tags: [
        {
          name: "Action",
          value: "Balance",
        },
      ],
    });

    const balanceResult = await result({
      process: tokenAddress,
      message: balanceMessage,
    });

    const balance = balanceResult.Messages[0].Data;

    if (BigInt(balance) < BigInt(amount)) {
      throw new Error("Insufficient balance");
    }

    const burnMessage = await message({
      process: tokenAddress,
      signer: this.aoSigner,
      tags: [
        { name: "Action", value: "Burn" },
        { name: "Quantity", value: amount.toString() },
        { name: "Forward-Wallet", value: destinationAddress },
      ],
    });

    return {
      txid: burnMessage,
      forProcess: tokenAddress,
    };
  }

  async mint(config: ArweaveMintOptions | ERC20MintOptions) {
    if (config.asset === BridgeAssets.vAR) {
      return this.mintVAR(config.amount, config.destinationAddress);
    }
    if (config.asset === BridgeAssets.vUSDC) {
      return this.mintVUSDC(
        config.amount,
        config.destinationAddress,
        config.includeApproval
      );
    }
    throw new Error(
      `Minting ${(config as ERC20MintOptions).asset} is not supported`
    );
  }

  private async mintVUSDC(
    amount: string,
    destinationAddress: string,
    includeApproval?: boolean
  ) {
    return this.mintWrappedERC20(
      amount,
      destinationAddress,
      ETH_TOKENS.USDC,
      includeApproval || true
    );
  }

  private async mintWrappedERC20(
    amount: string,
    destinationAddress: string,
    tokenAddress: string,
    includeApproval: boolean
  ) {
    if (!this.ethSigner) {
      throw new Error("No eth signer provided in config");
    }
    if (!isValidArweaveAddress(destinationAddress)) {
      throw new Error("Destination address is not a valid Arweave address");
    }
    const config = await this.getBridgeConfig();
    const minAmount = BigInt(config.MININUM_USDC_BRIDGE);
    if (BigInt(amount) < minAmount) {
      throw new Error(
        `Minimum bridge amount is ${minAmount} AR, ${amount} AR provided`
      );
    }
    const tokenContract = new ETHContract(
      tokenAddress,
      erc20Abi,
      this.ethSigner
    );
    const balance = await tokenContract.balanceOf(this.ethSigner.address);
    if (BigInt(balance) < BigInt(amount)) {
      throw new Error("Insufficient balance");
    }
    const approveTx = await tokenContract.approve(
      ETH_BRIDGE_CONTRACT_ADDRESS,
      amount
    );

    if (includeApproval) {
      try {
        const approveTxReceipt = await this.ethSigner.sendTransaction(
          approveTx
        );
        await approveTxReceipt.wait();
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        throw new Error(`Failed to approve ERC20 token transfer: ${error}`);
      }
    }

    try {
      const bridgeContract = new ETHContract(
        ETH_BRIDGE_CONTRACT_ADDRESS,
        bridgeContractAbi,
        this.ethSigner
      );
      const bridgeTx = await bridgeContract.bridge(
        tokenAddress,
        amount,
        destinationAddress
      );
      const bridgeTxReceipt = await this.ethSigner.sendTransaction(bridgeTx);
      await bridgeTxReceipt.wait();
      return {
        txid: bridgeTxReceipt.hash,
      };
    } catch (error) {
      throw new Error(`Failed to bridge ERC20 token: ${error}`);
    }
  }

  private async mintVAR(amount: string, destinationAddress: string) {
    if (!this.arweaveWallet) {
      throw new Error("No arweave wallet provided in config");
    }
    if (!isValidArweaveAddress(destinationAddress)) {
      throw new Error("Destination address is not a valid Arweave address");
    }
    const config = await this.getBridgeConfig();
    const minAmount = BigInt(config.MININUM_ARWEAVE_BRIDGE);
    if (BigInt(amount) < minAmount) {
      throw new Error(
        `Minimum bridge amount is ${minAmount} AR, ${amount} AR provided`
      );
    }

    const address = await this.arweave.wallets.jwkToAddress(this.arweaveWallet);
    const balance = await this.arweave.wallets.getBalance(address);
    if (BigInt(balance) < BigInt(amount)) {
      throw new Error("Insufficient balance");
    }
    const tx = await this.arweave.createTransaction({
      target: ARWEAVE_BRIDGE_ADDRESS,
      quantity: amount,
    });
    tx.addTag("App-Name", "Vento-Bridge");
    tx.addTag("Action", "BridgeARToVAR");
    tx.addTag("Forward-Wallet", destinationAddress);

    await this.arweave.transactions.sign(tx, this.arweaveWallet);
    await this.arweave.transactions.post(tx);
    return {
      txid: tx.id,
    };
  }

  private async getBridgeConfig(): Promise<BridgeConfig> {
    const result = await fetch("https://api.ventoswap.com/bridge");
    if (!result.ok) {
      throw new Error("Failed to fetch bridge config");
    }
    return result.json();
  }
}

const erc20Abi = [
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

const bridgeContractAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "tokenContract",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "string",
        name: "aoAddress",
        type: "string",
      },
    ],
    name: "bridge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "tokenContract",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "aoAddress",
        type: "string",
      },
    ],
    name: "BridgeInitiated",
    type: "event",
  },
];

function isValidArweaveAddress(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const address = value.trim();
  return /^[A-Za-z0-9_-]{43}$/.test(address);
}

function isValidEthereumAddress(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const address = value.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
