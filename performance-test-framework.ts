/**
 * Performance Testing Framework for API Endpoints
 * Tests for response times, throughput, and scalability
 */

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  memoryUsage?: NodeJS.MemoryUsage;
  successful: boolean;
}

export interface LoadTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number; // requests per second
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  duration: number; // test duration in ms
}

export const performanceTestFramework = {

  /**
   * Load testing for a single endpoint
   */
  async loadTest(
    endpoint: string,
    method: string = 'GET',
    payload: any = {},
    options: {
      concurrency: number;
      duration: number; // in seconds
      rampUp?: number; // in seconds
      headers?: Record<string, string>;
    }
  ): Promise<LoadTestResult> {
    const metrics: PerformanceMetrics[] = [];
    const startTime = Date.now();
    const endTime = startTime + (options.duration * 1000);
    
    // Ramp up period
    const rampUpDuration = options.rampUp || 10;
    const rampUpIncrement = options.concurrency / (rampUpDuration * 10);
    
    let currentConcurrency = 1;
    const workers: Promise<void>[] = [];

    while (Date.now() < endTime) {
      // Gradually increase concurrency during ramp up
      if (Date.now() < startTime + (rampUpDuration * 1000)) {
        currentConcurrency = Math.min(
          currentConcurrency + rampUpIncrement,
          options.concurrency
        );
      } else {
        currentConcurrency = options.concurrency;
      }

      // Start workers up to current concurrency
      while (workers.length < Math.floor(currentConcurrency)) {
        workers.push(this.performanceWorker(endpoint, method, payload, options.headers, metrics, endTime));
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    return this.calculateLoadTestResults(endpoint, metrics, Date.now() - startTime);
  },

  /**
   * Individual performance worker
   */
  async performanceWorker(
    endpoint: string,
    method: string,
    payload: any,
    headers: Record<string, string> = {},
    metrics: PerformanceMetrics[],
    endTime: number
  ): Promise<void> {
    while (Date.now() < endTime) {
      const startTime = Date.now();
      const memoryBefore = process.memoryUsage();

      try {
        // Mock API call - replace with actual HTTP client
        const response = await this.mockApiCall(endpoint, method, payload, headers);
        
        const responseTime = Date.now() - startTime;
        const memoryAfter = process.memoryUsage();

        metrics.push({
          endpoint,
          method,
          responseTime,
          statusCode: response.status,
          timestamp: new Date(),
          memoryUsage: {
            rss: memoryAfter.rss - memoryBefore.rss,
            heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
            heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
            external: memoryAfter.external - memoryBefore.external,
            arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers
          },
          successful: response.status >= 200 && response.status < 300
        });

        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        metrics.push({
          endpoint,
          method,
          responseTime,
          statusCode: 500,
          timestamp: new Date(),
          successful: false
        });
      }
    }
  },

  /**
   * Mock API call for performance testing template
   */
  async mockApiCall(
    endpoint: string,
    method: string,
    payload: any,
    headers: Record<string, string>
  ): Promise<{ status: number; data?: any }> {
    // Simulate network delay
    const delay = Math.random() * 100 + 50; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate different response codes
    const random = Math.random();
    if (random < 0.95) {
      return { status: 200, data: { success: true } };
    } else if (random < 0.98) {
      return { status: 400, data: { error: 'Bad request' } };
    } else {
      return { status: 500, data: { error: 'Internal server error' } };
    }
  },

  /**
   * Calculate load test results from metrics
   */
  calculateLoadTestResults(endpoint: string, metrics: PerformanceMetrics[], duration: number): LoadTestResult {
    const successfulRequests = metrics.filter(m => m.successful).length;
    const failedRequests = metrics.length - successfulRequests;
    
    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const sum = responseTimes.reduce((a, b) => a + b, 0);
    
    const percentiles = {
      p50: this.calculatePercentile(responseTimes, 0.5),
      p90: this.calculatePercentile(responseTimes, 0.9),
      p95: this.calculatePercentile(responseTimes, 0.95),
      p99: this.calculatePercentile(responseTimes, 0.99)
    };

    return {
      endpoint,
      totalRequests: metrics.length,
      successfulRequests,
      failedRequests,
      averageResponseTime: sum / metrics.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      throughput: (metrics.length / duration) * 1000, // requests per second
      percentiles,
      errorRate: (failedRequests / metrics.length) * 100,
      duration
    };
  },

  /**
   * Calculate percentile from sorted array
   */
  calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[index] || 0;
  },

  /**
   * Stress testing - gradually increase load until failure
   */
  async stressTest(
    endpoint: string,
    method: string = 'GET',
    payload: any = {},
    options: {
      startConcurrency: number;
      maxConcurrency: number;
      stepDuration: number; // seconds
      stepIncrement: number;
      headers?: Record<string, string>;
    }
  ): Promise<{ breakingPoint: number; results: LoadTestResult[] }> {
    const results: LoadTestResult[] = [];
    let currentConcurrency = options.startConcurrency;
    
    while (currentConcurrency <= options.maxConcurrency) {
      console.log(`Testing with ${currentConcurrency} concurrent users...`);
      
      const result = await this.loadTest(endpoint, method, payload, {
        concurrency: currentConcurrency,
        duration: options.stepDuration,
        headers: options.headers
      });
      
      results.push(result);
      
      // Check if this is the breaking point
      if (result.errorRate > 5 || result.averageResponseTime > 5000) {
        return {
          breakingPoint: currentConcurrency,
          results
        };
      }
      
      currentConcurrency += options.stepIncrement;
    }
    
    return {
      breakingPoint: -1, // No breaking point found
      results
    };
  },

  /**
   * Memory leak detection test
   */
  async memoryLeakTest(
    endpoint: string,
    method: string = 'GET',
    payload: any = {},
    options: {
      duration: number; // in seconds
      interval: number; // measurement interval in seconds
      headers?: Record<string, string>;
    }
  ): Promise<{
    memorySnapshots: Array<{ timestamp: Date; memory: NodeJS.MemoryUsage; requests: number }>;
    leakDetected: boolean;
    growthRate: number; // MB per second
  }> {
    const snapshots: Array<{ timestamp: Date; memory: NodeJS.MemoryUsage; requests: number }> = [];
    const startTime = Date.now();
    const endTime = startTime + (options.duration * 1000);
    let requestCount = 0;

    // Take initial snapshot
    snapshots.push({
      timestamp: new Date(),
      memory: process.memoryUsage(),
      requests: 0
    });

    // Start making requests
    const requestPromise = this.continuousRequests(endpoint, method, payload, options.headers, endTime, () => requestCount++);

    // Take memory snapshots at intervals
    const snapshotInterval = setInterval(() => {
      snapshots.push({
        timestamp: new Date(),
        memory: process.memoryUsage(),
        requests: requestCount
      });
    }, options.interval * 1000);

    await requestPromise;
    clearInterval(snapshotInterval);

    // Final snapshot
    snapshots.push({
      timestamp: new Date(),
      memory: process.memoryUsage(),
      requests: requestCount
    });

    // Analyze for memory leaks
    const initialMemory = snapshots[0].memory.heapUsed;
    const finalMemory = snapshots[snapshots.length - 1].memory.heapUsed;
    const memoryGrowth = (finalMemory - initialMemory) / (1024 * 1024); // MB
    const timeElapsed = options.duration; // seconds
    const growthRate = memoryGrowth / timeElapsed;

    return {
      memorySnapshots: snapshots,
      leakDetected: growthRate > 1, // More than 1MB per second growth
      growthRate
    };
  },

  /**
   * Continuous request worker for memory leak testing
   */
  async continuousRequests(
    endpoint: string,
    method: string,
    payload: any,
    headers: Record<string, string> = {},
    endTime: number,
    onRequest: () => void
  ): Promise<void> {
    while (Date.now() < endTime) {
      try {
        await this.mockApiCall(endpoint, method, payload, headers);
        onRequest();
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        onRequest();
      }
    }
  },

  /**
   * Generate performance test report
   */
  generatePerformanceReport(results: LoadTestResult[]): {
    summary: any;
    recommendations: string[];
    performance_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  } {
    const avgResponseTime = results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length;
    const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
    const avgErrorRate = results.reduce((sum, r) => sum + r.errorRate, 0) / results.length;

    const recommendations: string[] = [];
    
    if (avgResponseTime > 2000) {
      recommendations.push('Consider implementing caching mechanisms to reduce response times');
    }
    
    if (avgErrorRate > 1) {
      recommendations.push('Investigate and fix sources of errors to improve reliability');
    }
    
    if (avgThroughput < 100) {
      recommendations.push('Consider scaling infrastructure or optimizing code for better throughput');
    }

    // Performance grading
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (avgResponseTime < 500 && avgErrorRate < 0.1 && avgThroughput > 500) {
      grade = 'A';
    } else if (avgResponseTime < 1000 && avgErrorRate < 0.5 && avgThroughput > 200) {
      grade = 'B';
    } else if (avgResponseTime < 2000 && avgErrorRate < 1 && avgThroughput > 100) {
      grade = 'C';
    } else if (avgResponseTime < 5000 && avgErrorRate < 5) {
      grade = 'D';
    }

    return {
      summary: {
        averageResponseTime: avgResponseTime,
        averageThroughput: avgThroughput,
        averageErrorRate: avgErrorRate,
        totalEndpointsTested: results.length
      },
      recommendations,
      performance_grade: grade
    };
  }
};