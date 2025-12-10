import axios, { AxiosError } from 'axios';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  jitter: boolean; // Add random jitter to prevent thundering herd
  retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
  data: T;
  attempts: number;
  totalTime: number;
}

export class RetryService {
  private static readonly DEFAULT_OPTIONS: RetryOptions = {
    maxRetries: 5,
    baseDelay: 1000, // 1 second
    maxDelay: 16000, // 16 seconds
    jitter: true,
    retryCondition: (error: any) => {
      // Retry on network errors, timeouts, and 5xx server errors
      if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
        const status = error.response?.status;
        return (
          !status || // Network error
          status >= 500 || // Server errors
          status === 429 || // Rate limiting
          error.code === 'ECONNABORTED' // Timeout
        );
      }
      // Also retry on generic network errors
      if (error instanceof Error && error.message.includes('Network')) {
        return true;
      }
      return false; // Don't retry other types of errors
    }
  };

  /**
   * Execute a function with exponential backoff retry logic
   * Requirements: 2.3
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    let lastError: any;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const data = await operation();
        return {
          data,
          attempts: attempt + 1,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error;

        // Don't retry if this is the last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Check if we should retry this error
        if (!config.retryCondition!(error)) {
          // Don't retry, throw the error immediately
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, config);
        
        // Log retry attempt
        console.warn(
          `Retry attempt ${attempt + 1}/${config.maxRetries + 1} failed. ` +
          `Retrying in ${delay}ms. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // All retries exhausted, throw the last error
    throw new Error(
      `Operation failed after ${config.maxRetries + 1} attempts. ` +
      `Last error: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`
    );
  }

  /**
   * Calculate delay for exponential backoff with jitter
   */
  private static calculateDelay(attempt: number, options: RetryOptions): number {
    // Exponential backoff: baseDelay * 2^attempt
    let delay = options.baseDelay * Math.pow(2, attempt);
    
    // Cap at maximum delay
    delay = Math.min(delay, options.maxDelay);
    
    // Add jitter to prevent thundering herd problem
    if (options.jitter) {
      // Add random jitter of ±25%
      const jitterRange = delay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay += jitter;
    }
    
    return Math.max(0, Math.round(delay));
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retry wrapper for HTTP requests
   */
  static createHttpRetryWrapper(options: Partial<RetryOptions> = {}) {
    return async <T>(requestFn: () => Promise<T>): Promise<T> => {
      const result = await this.executeWithRetry(requestFn, {
        ...options,
        retryCondition: (error: any) => {
          if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
            const status = error.response?.status;
            // Don't retry client errors (4xx) except rate limiting (429)
            if (status && status >= 400 && status < 500 && status !== 429) {
              return false;
            }
            // Retry network errors, timeouts, and server errors
            return (
              !status || // Network error
              status >= 500 || // Server errors
              status === 429 || // Rate limiting
              error.code === 'ECONNABORTED' // Timeout
            );
          }
          // Also retry on generic network errors
          if (error instanceof Error && error.message.includes('Network')) {
            return true;
          }
          return false;
        }
      });
      return result.data;
    };
  }
}

/**
 * Circuit breaker pattern for API endpoints
 * Prevents cascading failures by temporarily disabling failing services
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000, // 1 minute
    private readonly monitoringWindow: number = 300000 // 5 minutes
  ) {}

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      
      // Success - reset failure count if we were in HALF_OPEN state
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record a failure and potentially open the circuit
   */
  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`Circuit breaker opened after ${this.failures} failures`);
    }
  }

  /**
   * Reset the circuit breaker
   */
  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    console.info('Circuit breaker reset to CLOSED state');
  }

  /**
   * Get current circuit breaker state
   */
  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Rate limiter to prevent API abuse
 */
export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private readonly maxRequests: number = 100,
    private readonly windowMs: number = 60000 // 1 minute
  ) {}

  /**
   * Check if request is allowed under rate limit
   */
  isAllowed(): boolean {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check if we're under the limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }

  /**
   * Get time until next request is allowed (in milliseconds)
   */
  getTimeUntilReset(): number {
    if (this.requests.length === 0) {
      return 0;
    }
    
    const oldestRequest = Math.min(...this.requests);
    const timeUntilReset = this.windowMs - (Date.now() - oldestRequest);
    
    return Math.max(0, timeUntilReset);
  }

  /**
   * Get current rate limit status
   */
  getStatus(): { remaining: number; resetTime: number; total: number } {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    return {
      remaining: this.maxRequests - this.requests.length,
      resetTime: this.requests.length > 0 ? Math.min(...this.requests) + this.windowMs : now,
      total: this.maxRequests
    };
  }
}

/**
 * Fallback cache for when APIs are unavailable
 */
export class FallbackCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>();

  constructor(private readonly defaultTTL: number = 3600000) {} // 1 hour default

  /**
   * Set cached data with TTL
   */
  set(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cached data if not expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    this.cleanup(); // Clean up first
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instances for common use cases
export const httpRetry = RetryService.createHttpRetryWrapper({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 8000,
  jitter: true
});

export const astronomicalCircuitBreaker = new CircuitBreaker(3, 30000, 180000); // 3 failures, 30s timeout, 3min window
export const crimeDataCircuitBreaker = new CircuitBreaker(5, 60000, 300000); // 5 failures, 1min timeout, 5min window

export const astronomicalRateLimiter = new RateLimiter(60, 60000); // 60 requests per minute
export const crimeDataRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

export const fallbackCache = new FallbackCache<any>(3600000); // 1 hour TTL