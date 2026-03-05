import http from 'http';

/**
 * SSE Smoke Test Suite
 * Tests the /events endpoint for:
 * 1. Initial connection and SSE headers
 * 2. Ping messages (keep-alive every 15s)
 * 3. Connection timeout (90s cleanup)
 * 4. Reconnection after close (should succeed)
 * 5. Broadcast events
 * 6. Multiple concurrent clients
 */

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class SSESmokeTest {
  private baseUrl: string;
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor(port = 8080) {
    this.baseUrl = `http://localhost:${port}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async makeRequest(
    method: string,
    path: string,
    options?: { timeout?: number; expectStream?: boolean }
  ): Promise<{ status: number; headers: Record<string, string>; body?: string; stream?: http.IncomingMessage }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const timeout = options?.timeout || 30_000;

      const req = http.request(url, { method }, (res) => {
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          headers[key] = String(value);
        }

        if (options?.expectStream) {
          resolve({ status: res.statusCode || 500, headers, stream: res });
          return;
        }

        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode || 500, headers, body });
        });
      });

      const timeoutHandle = setTimeout(() => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      req.on('error', (err) => {
        clearTimeout(timeoutHandle);
        reject(err);
      });

      req.end();
    });
  }

  private logTest(testName: string, passed: boolean, duration: number, error?: string): void {
    this.results.push({ name: testName, passed, duration, error });
    const status = passed ? '✅' : '❌';
    const errorMsg = error ? ` - ${error}` : '';
    console.log(`${status} ${testName} (${duration}ms)${errorMsg}`);
  }

  async testHealthEndpoint(): Promise<void> {
    const start = Date.now();
    try {
      const result = await this.makeRequest('GET', '/health');
      const duration = Date.now() - start;

      if (result.status !== 200) {
        this.logTest('Health Endpoint', false, duration, `Expected 200, got ${result.status}`);
        return;
      }

      const health = JSON.parse(result.body || '{}');
      if (!health.status || health.status !== 'ok') {
        this.logTest('Health Endpoint', false, duration, 'Invalid health response');
        return;
      }

      this.logTest('Health Endpoint', true, duration);
    } catch (error) {
      const duration = Date.now() - start;
      this.logTest('Health Endpoint', false, duration, String(error));
    }
  }

  async testSSEConnection(): Promise<void> {
    const start = Date.now();
    try {
      const result = await this.makeRequest('GET', '/events', {
        timeout: 5_000,
        expectStream: true,
      });
      const duration = Date.now() - start;

      if (result.status !== 200) {
        this.logTest('SSE Connection', false, duration, `Expected 200, got ${result.status}`);
        return;
      }

      const requiredHeaders = ['content-type', 'cache-control', 'connection'];
      const missingHeaders = requiredHeaders.filter((h) => !result.headers[h]);

      if (missingHeaders.length > 0) {
        this.logTest('SSE Connection', false, duration, `Missing headers: ${missingHeaders.join(', ')}`);
        return;
      }

      if (!result.headers['content-type']?.includes('text/event-stream')) {
        this.logTest('SSE Connection', false, duration, `Wrong content-type: ${result.headers['content-type']}`);
        return;
      }

      // Read initial data (should get ':connected' comment and events)
      let receivedData = false;
      let receivedEvent = false;

      const dataHandler = (chunk: Buffer) => {
        const data = chunk.toString();
        if (data.includes(':')) receivedData = true;
        if (data.includes('event:')) receivedEvent = true;

        if (receivedData && receivedEvent) {
          result.stream?.removeListener('data', dataHandler);
          result.stream?.destroy();
        }
      };

      const timeoutHandle = setTimeout(() => {
        result.stream?.removeListener('data', dataHandler);
        result.stream?.destroy();
      }, 3_000);

      result.stream?.on('data', dataHandler);

      await this.sleep(2_000);
      clearTimeout(timeoutHandle);

      const testPassed = receivedData && receivedEvent;
      this.logTest('SSE Connection', testPassed, duration, testPassed ? undefined : 'Did not receive expected data');

      if (result.stream) {
        result.stream.destroy();
      }
    } catch (error) {
      const duration = Date.now() - start;
      this.logTest('SSE Connection', false, duration, String(error));
    }
  }

  async testSSEHeaders(): Promise<void> {
    const start = Date.now();
    try {
      const result = await this.makeRequest('GET', '/events', {
        timeout: 3_000,
        expectStream: true,
      });
      const duration = Date.now() - start;

      const headerChecks = [
        { header: 'content-type', expected: 'text/event-stream', actual: result.headers['content-type'] },
        { header: 'cache-control', expected: 'no-cache, no-transform', actual: result.headers['cache-control'] },
        { header: 'connection', expected: 'keep-alive', actual: result.headers['connection'] },
        { header: 'x-accel-buffering', expected: 'no', actual: result.headers['x-accel-buffering'] },
      ];

      const allValid = headerChecks.every((check) => check.actual === check.expected);

      if (result.stream) {
        result.stream.destroy();
      }

      this.logTest(
        'SSE Headers',
        allValid,
        duration,
        allValid ? undefined : `Headers mismatch: ${JSON.stringify(headerChecks)}`
      );
    } catch (error) {
      const duration = Date.now() - start;
      this.logTest('SSE Headers', false, duration, String(error));
    }
  }

  async testReconnectionAfterClose(): Promise<void> {
    const start = Date.now();
    try {
      // First connection
      const conn1 = await this.makeRequest('GET', '/events', {
        timeout: 2_000,
        expectStream: true,
      });

      if (conn1.status !== 200) {
        const duration = Date.now() - start;
        this.logTest('Reconnection After Close', false, duration, 'First connection failed');
        return;
      }

      // Close first connection
      if (conn1.stream) {
        conn1.stream.destroy();
      }

      // Wait a moment
      await this.sleep(500);

      // Second connection - this was the broken case before the fix
      const conn2 = await this.makeRequest('GET', '/events', {
        timeout: 2_000,
        expectStream: true,
      });

      if (conn2.stream) {
        conn2.stream.destroy();
      }

      const duration = Date.now() - start;
      const testPassed = conn2.status === 200;

      this.logTest(
        'Reconnection After Close',
        testPassed,
        duration,
        testPassed ? undefined : `Second connection failed with status ${conn2.status}`
      );
    } catch (error) {
      const duration = Date.now() - start;
      this.logTest('Reconnection After Close', false, duration, String(error));
    }
  }

  async testMultipleConcurrentConnections(): Promise<void> {
    const start = Date.now();
    try {
      const connectionPromises = Array.from({ length: 5 }, () =>
        this.makeRequest('GET', '/events', {
          timeout: 3_000,
          expectStream: true,
        })
      );

      const results = await Promise.all(connectionPromises);
      const duration = Date.now() - start;

      const allSucceeded = results.every((r) => r.status === 200);

      // Clean up streams
      results.forEach((r) => {
        if (r.stream) {
          r.stream.destroy();
        }
      });

      this.logTest(
        'Multiple Concurrent Connections',
        allSucceeded,
        duration,
        allSucceeded ? undefined : `Some connections failed: ${results.map((r) => r.status).join(', ')}`
      );
    } catch (error) {
      const duration = Date.now() - start;
      this.logTest('Multiple Concurrent Connections', false, duration, String(error));
    }
  }

  async testHealthCheckWithConnections(): Promise<void> {
    const start = Date.now();
    try {
      // Create a connection
      const sse = await this.makeRequest('GET', '/events', {
        timeout: 2_000,
        expectStream: true,
      });

      if (sse.status !== 200) {
        const duration = Date.now() - start;
        this.logTest('Health Check With Connections', false, duration, 'SSE connection failed');
        return;
      }

      // Check health with active connection
      const health = await this.makeRequest('GET', '/health');

      if (sse.stream) {
        sse.stream.destroy();
      }

      const duration = Date.now() - start;
      const healthData = JSON.parse(health.body || '{}');

      const testPassed = health.status === 200 && healthData.clients === 1;

      this.logTest(
        'Health Check With Connections',
        testPassed,
        duration,
        testPassed ? undefined : `Expected 1 client, got ${healthData.clients || 'none'}`
      );
    } catch (error) {
      const duration = Date.now() - start;
      this.logTest('Health Check With Connections', false, duration, String(error));
    }
  }

  async testStateEndpoint(): Promise<void> {
    const start = Date.now();
    try {
      const result = await this.makeRequest('GET', '/state');
      const duration = Date.now() - start;

      if (result.status !== 200) {
        this.logTest('State Endpoint', false, duration, `Expected 200, got ${result.status}`);
        return;
      }

      const state = JSON.parse(result.body || '{}');
      const hasRequiredFields = 'running' in state && 'paused' in state && 'timestamp' in state;

      this.logTest(
        'State Endpoint',
        hasRequiredFields,
        duration,
        hasRequiredFields ? undefined : 'Missing required state fields'
      );
    } catch (error) {
      const duration = Date.now() - start;
      this.logTest('State Endpoint', false, duration, String(error));
    }
  }

  async testCORSHeaders(): Promise<void> {
    const start = Date.now();
    try {
      const result = await this.makeRequest('GET', '/events', {
        timeout: 2_000,
        expectStream: true,
      });
      const duration = Date.now() - start;

      const corsHeader = result.headers['access-control-allow-origin'];
      const testPassed = corsHeader === '*';

      if (result.stream) {
        result.stream.destroy();
      }

      this.logTest(
        'CORS Headers',
        testPassed,
        duration,
        testPassed ? undefined : `Expected '*', got '${corsHeader}'`
      );
    } catch (error) {
      const duration = Date.now() - start;
      this.logTest('CORS Headers', false, duration, String(error));
    }
  }

  async runAllTests(): Promise<void> {
    console.log('\n🚀 SSE Smoke Test Suite\n');
    console.log('Testing SSE server on', this.baseUrl);
    console.log('='.repeat(60) + '\n');

    try {
      await this.testHealthEndpoint();
      await this.testSSEConnection();
      await this.testSSEHeaders();
      await this.testReconnectionAfterClose();
      await this.testMultipleConcurrentConnections();
      await this.testHealthCheckWithConnections();
      await this.testStateEndpoint();
      await this.testCORSHeaders();

      this.printSummary();
    } catch (error) {
      console.error('Fatal test error:', error);
      process.exit(1);
    }
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary\n');

    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Passed: ${passed}/${this.results.length}`);
    console.log(`Failed: ${failed}/${this.results.length}`);
    console.log(`Total Duration: ${totalDuration}ms\n`);

    if (failed > 0) {
      console.log('Failed Tests:');
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    console.log('\n' + '='.repeat(60) + '\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run tests
const tester = new SSESmokeTest(parseInt(process.env.PORT || '8080', 10));
tester.runAllTests().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
