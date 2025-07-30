export interface SDKConfig {
  apiBaseUrl?: string;
  timeout?: number;
  signer?: any;
}

export interface SwapQuoteRequest {
  fromTokenId: string;
  toTokenId: string;
  amount: number;
  userAddress?: string;
}

export interface SwapQuoteResponse {
  fromTokenId: string;
  toTokenId: string;
  inputAmount: number;
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
  estimatedOutput?: number;
  estimatedFee?: number;
  intermediateOutput?: number;
  intermediateTokenId?: string;
  error?: string;
}

export interface RouteWithEstimate extends Route {
  estimatedOutput: number;
  estimatedFee: number;
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
  amount: number;
  minAmount: number;
  userAddress: string;
}

export interface SwapMessageResponse {
  unsignedMessage: UnsignedMessage;
  route: RouteWithEstimate;
  fromTokenId: string;
  toTokenId: string;
  amount: number;
  minAmount: number;
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
