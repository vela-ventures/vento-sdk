import type {
  SDKConfig,
  SwapQuoteRequest,
  SwapQuoteResponse,
  SwapStatusResponse,
  ReverseQuoteRequest,
  ReverseQuoteResponse,
  SwapMessageRequest,
  SwapMessageResponse,
  PoolData,
  RouteWithEstimate,
  SwapResult,
  UnsignedMessage,
  ApiError
} from './types';

export class VentoClient {
  private apiBaseUrl?: string;
  private timeout: number;
  private signer?: any;

  constructor(config: SDKConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl || 'https://api.ventoswap.com';
    this.timeout = config.timeout || 30000;
    this.signer = config.signer;
  }

  async getHealth(): Promise<{ status: string; message: string; timestamp: string }> {
    return this.request('GET', '/');
  }

  async getSwapQuote(request: SwapQuoteRequest): Promise<SwapQuoteResponse> {
    return this.request('POST', '/swap/quote', request);
  }

  async getSwapStatus(swapId: string): Promise<SwapStatusResponse> {
    return this.request('GET', `/swap/status?swapId=${encodeURIComponent(swapId)}`);
  }

  async getReverseQuote(request: ReverseQuoteRequest): Promise<ReverseQuoteResponse> {
    return this.request('POST', '/swap/reverse-quote', request);
  }

  async getPools(forceRefresh = false): Promise<PoolData> {
    const params = forceRefresh ? '?refresh=true' : '';
    return this.request('GET', `/swap/pools${params}`);
  }

  async prepareSwapMessage(request: SwapMessageRequest): Promise<SwapMessageResponse> {
    return this.request('POST', '/messages/swap', request);
  }

  async getBestRoute(
    fromTokenId: string,
    toTokenId: string,
    amount: string,
    userAddress?: string
  ): Promise<RouteWithEstimate | null> {
    const quote = await this.getSwapQuote({
      fromTokenId,
      toTokenId,
      amount,
      userAddress
    });
    
    return quote.bestRoute;
  }

  async executeSwap(
    route: RouteWithEstimate,
    fromTokenId: string,
    toTokenId: string,
    amount: string,
    minAmount: string,
    userAddress: string
  ): Promise<SwapResult> {
    if (!this.signer) {
      throw new Error('No signer provided. Please initialize the client with a signer.');
    }

    const messageResponse = await this.prepareSwapMessage({
      route,
      fromTokenId,
      toTokenId,
      amount,
      minAmount,
      userAddress
    });

    return this.signAndSendMessage(messageResponse.unsignedMessage);
  }

  async signAndSendMessage(unsignedMessage: UnsignedMessage): Promise<SwapResult> {
    if (!this.signer) {
      throw new Error('No signer provided. Please initialize the client with a signer.');
    }

    try {
      const { message } = await import('@permaweb/aoconnect');
    
      const messageId = await message({
        process: unsignedMessage.process,
        tags: unsignedMessage.tags,
        data: unsignedMessage.data,
        signer: this.signer
      });

      return {
        messageId,
        transactionId: messageId,
        success: true
      };
    } catch (error) {
      throw new Error('Failed to sign and send message: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  static calculateMinAmount(estimatedOutput: string, slippagePercent: number): string {
    const out = VentoClient.toBigInt(estimatedOutput);
    const bps = Math.round(slippagePercent * 100);
    const numer = BigInt(10000 - bps);
    const denom = BigInt(10000);
    return ((out * numer) / denom).toString();
  }

  private static toBigInt(value: string): bigint {
    if (!/^[0-9]+$/.test(value)) {
      throw new Error(`Invalid integer string: ${value}`);
    }
    return BigInt(value);
  }

  async hasValidPair(fromTokenId: string, toTokenId: string): Promise<boolean> {
    try {
      const quote = await this.getSwapQuote({
        fromTokenId,
        toTokenId,
        amount: '1',
      });
      
      return quote.routes.length > 0;
    } catch {
      return false;
    }
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${this.apiBaseUrl}${path}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.getCustomHeaders()),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ApiError = new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
        error.status = response.status;
        error.response = errorData;
        throw error;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: ApiError = new Error(`Request timeout after ${this.timeout}ms`);
        timeoutError.status = 408;
        throw timeoutError;
      }
      
      throw error;
    }
  }

  private getCustomHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (typeof window === 'undefined') {
      headers['User-Agent'] = 'ao-dex-sdk/1.0.6';
    }
    
    return headers;
  }
} 