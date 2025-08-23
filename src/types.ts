import { Wallet as EthSigner } from "ethers";

export interface SDKConfig {
  apiBaseUrl?: string;
  timeout?: number;
  signer?: any;
  ethSigner?: EthSigner;
  arweaveWallet?: any;
}

export interface SwapQuoteRequest {
  fromTokenId: string;
  toTokenId: string;
  amount: string;
  userAddress?: string;
}

export interface SwapQuoteResponse {
  fromTokenId: string;
  toTokenId: string;
  inputAmount: string;
  routes: RouteWithEstimate[];
  bestRoute: RouteWithEstimate | null;
  totalRoutesFound: number;
  validRoutesWithEstimates: number;
  executionTime: number;
}

export interface SwapStatusResponse {
  swapId: string;
  status: string;
  [key: string]: any;
}

export interface ReverseQuoteRequest {
  fromTokenId: string;
  toTokenId: string;
  desiredOutput: string;
  userAddress?: string;
}

export interface ReverseQuoteResponse {
  fromTokenId: string;
  toTokenId: string;
  desiredOutput: string;
  routes: RouteWithReverseEstimate[];
  bestRoute: RouteWithReverseEstimate | null;
  totalRoutesFound: number;
  validRoutesWithEstimates: number;
  executionTime: number;
}

export interface RouteWithReverseEstimate extends Route {
  requiredInput: string;
  estimatedFee: string;
  inputWithFee: string;
  intermediateInputRequired?: string;
  intermediateEstimatedFee?: string;
}

export interface RoutePool {
  poolId: string;
  tokenIn: string;
  tokenOut: string;
  fee?: string;
}

export interface Route {
  dex: "botega" | "permaswap";
  pools: RoutePool[];
  hops: number;
  estimatedOutput?: string;
  estimatedFee?: string;
  intermediateOutput?: string;
  intermediateEstimatedFee?: string;
  intermediateTokenId?: string;
  error?: string;
}

export interface RouteWithEstimate extends Route {
  estimatedOutput: string;
  estimatedFee: string;
}

export interface UnsignedMessage {
  process: string;
  tags: Array<{ name: string; value: string }>;
  data?: string;
}

export interface SwapMessageRequest {
  route: RouteWithEstimate;
  fromTokenId: string;
  toTokenId: string;
  amount: string;
  minAmount: string;
  userAddress: string;
}

export interface SwapMessageResponse {
  unsignedMessage: UnsignedMessage;
  route: RouteWithEstimate;
  fromTokenId: string;
  toTokenId: string;
  amount: string;
  minAmount: string;
  userAddress: string;
  timestamp: number;
  status: "unsigned" | "ready_to_sign";
  orderIds?: string[];
  orderStatusData?: any[];
}

export interface PoolData {
  botegaPools: Array<{
    poolId: string;
    tokenA: string;
    tokenB: string;
  }>;
  permaswapPools: Array<{
    process: string;
    x: string;
    y: string;
    fee: string;
  }>;
}

export interface SwapResult {
  messageId: string;
  transactionId: string;
  success: boolean;
}

export interface ApiError extends Error {
  status?: number;
  response?: any;
}

export enum BridgeAssets {
  vUSDC = "vUSDC",
  vAR = "vAR",
}
