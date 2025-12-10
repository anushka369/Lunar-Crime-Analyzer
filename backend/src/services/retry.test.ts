import { RetryService, CircuitBreaker, RateLimiter, FallbackCache } from './retry';
import axios from 'axios';

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RetryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await RetryService.executeWithRetry(operation);
      
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      // Start the retry operation
      const retryPromise = RetryService.executeWithRetry(operation, {
        maxRetries: 2,
        baseDelay: 100,
        jitter: false
      });
      
      // Fast-forward through the delay and wait for promises to resolve
      await jest.advanceTimersByTimeAsync(100);
      
      const result = await retryPromise;
      
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx server errors', async () => {
      const serverError = {
        isAxiosError: true,
        response: { status: 500, statusText: 'Internal Server Error' }
      };
      
      const operation = jest.fn()
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue('success');
      
      const retryPromise = RetryService.executeWithRetry(operation, {
        maxRetries: 2,
        baseDelay: 100,
        jitter: false
      });
      
      await jest.advanceTimersByTimeAsync(100);
      
      const result = await retryPromise;
      
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(2);
    });

    it('should not retry on 4xx client errors', async () => {
      const clientError = {
        isAxiosError: true,
        response: { status: 400, statusText: 'Bad Request' }
      };
      
      const operation = jest.fn().mockRejectedValue(clientError);
      
      await expect(
        RetryService.executeWithRetry(operation, { maxRetries: 2 })
      ).rejects.toEqual(clientError);
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 rate limiting', async () => {
      const rateLimitError = {
        isAxiosError: true,
        response: { status: 429, statusText: 'Too Many Requests' }
      };
      
      const operation = jest.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success');
      
      const retryPromise = RetryService.executeWithRetry(operation, {
        maxRetries: 2,
        baseDelay: 100,
        jitter: false
      });
      
      await jest.advanceTimersByTimeAsync(100);
      
      const result = await retryPromise;
      
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(2);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network error')); // Use retryable error
      
      await expect(
        RetryService.executeWithRetry(operation, {
          maxRetries: 0, // No retries, should fail immediately
          baseDelay: 100,
          jitter: false
        })
      ).rejects.toThrow();
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'))
        .mockResolvedValue('success');
      
      const retryPromise = RetryService.executeWithRetry(operation, {
        maxRetries: 3,
        baseDelay: 100,
        jitter: false
      });
      
      // First retry after 100ms, second retry after 200ms
      await jest.advanceTimersByTimeAsync(300);
      
      const result = await retryPromise;
      
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(2, 1000, 5000); // 2 failures, 1s timeout
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow operations when circuit is closed', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.execute(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should open circuit after failure threshold', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Failure'));
    
    // First failure
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');
    
    // Second failure - should open circuit
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure');
    
    // Third attempt - circuit should be open
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
    
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should transition to half-open after timeout', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Failure 1'))
      .mockRejectedValueOnce(new Error('Failure 2'))
      .mockResolvedValue('success');
    
    // Trigger failures to open circuit
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure 1');
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failure 2');
    
    // Circuit should be open
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
    
    // Fast-forward past recovery timeout
    jest.advanceTimersByTime(1100);
    
    // Should now allow one test request (half-open)
    const result = await circuitBreaker.execute(operation);
    expect(result).toBe('success');
  });

  it('should provide circuit state information', () => {
    const state = circuitBreaker.getState();
    
    expect(state).toHaveProperty('state');
    expect(state).toHaveProperty('failures');
    expect(state).toHaveProperty('lastFailureTime');
    expect(state.state).toBe('CLOSED');
    expect(state.failures).toBe(0);
  });
});

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(3, 1000); // 3 requests per second
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow requests under the limit', () => {
    expect(rateLimiter.isAllowed()).toBe(true);
    expect(rateLimiter.isAllowed()).toBe(true);
    expect(rateLimiter.isAllowed()).toBe(true);
  });

  it('should reject requests over the limit', () => {
    // Use up the limit
    rateLimiter.isAllowed();
    rateLimiter.isAllowed();
    rateLimiter.isAllowed();
    
    // Should be rejected
    expect(rateLimiter.isAllowed()).toBe(false);
  });

  it('should reset after time window', () => {
    // Use up the limit
    rateLimiter.isAllowed();
    rateLimiter.isAllowed();
    rateLimiter.isAllowed();
    
    expect(rateLimiter.isAllowed()).toBe(false);
    
    // Fast-forward past the window
    jest.advanceTimersByTime(1100);
    
    // Should be allowed again
    expect(rateLimiter.isAllowed()).toBe(true);
  });

  it('should provide rate limit status', () => {
    rateLimiter.isAllowed();
    rateLimiter.isAllowed();
    
    const status = rateLimiter.getStatus();
    
    expect(status.remaining).toBe(1);
    expect(status.total).toBe(3);
    expect(status.resetTime).toBeGreaterThan(Date.now());
  });

  it('should calculate time until reset', () => {
    rateLimiter.isAllowed();
    rateLimiter.isAllowed();
    rateLimiter.isAllowed();
    
    const timeUntilReset = rateLimiter.getTimeUntilReset();
    expect(timeUntilReset).toBeGreaterThan(0);
    expect(timeUntilReset).toBeLessThanOrEqual(1000);
  });
});

describe('FallbackCache', () => {
  let cache: FallbackCache<string>;

  beforeEach(() => {
    cache = new FallbackCache<string>(1000); // 1 second TTL
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should store and retrieve data', () => {
    cache.set('key1', 'value1');
    
    expect(cache.get('key1')).toBe('value1');
    expect(cache.has('key1')).toBe(true);
  });

  it('should return null for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should expire data after TTL', () => {
    cache.set('key1', 'value1', 500); // 500ms TTL
    
    expect(cache.get('key1')).toBe('value1');
    
    // Fast-forward past TTL
    jest.advanceTimersByTime(600);
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.has('key1')).toBe(false);
  });

  it('should use custom TTL when provided', () => {
    cache.set('key1', 'value1', 2000); // 2 second TTL
    
    // Fast-forward past default TTL but not custom TTL
    jest.advanceTimersByTime(1500);
    
    expect(cache.get('key1')).toBe('value1');
  });

  it('should cleanup expired entries', () => {
    cache.set('key1', 'value1', 500);
    cache.set('key2', 'value2', 1500);
    
    jest.advanceTimersByTime(1000);
    
    cache.cleanup();
    
    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.keys).toEqual(['key2']);
  });

  it('should provide cache statistics', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    const stats = cache.getStats();
    
    expect(stats.size).toBe(2);
    expect(stats.keys).toEqual(['key1', 'key2']);
  });
});