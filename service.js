class MockProvider1 {
  async send(email) {
    console.log('[MockProvider1] Sending to:', email.to);
    if (Math.random() < 0.5) throw new Error('Provider1 failed');
    return 'Provider1 success';
  }
}

class MockProvider2 {
  async send(email) {
    console.log('[MockProvider2] Sending to:', email.to);
    if (Math.random() < 0.5) throw new Error('Provider2 failed');
    return 'Provider2 success';
  }
}

class CircuitBreaker {
  constructor(failureThreshold = 3, recoveryTimeMs = 30000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeMs = recoveryTimeMs;
    this.failures = 0;
    this.lastFailureTime = null;
    this.open = false;
  }

  canProceed() {
    if (!this.open) return true;
    if (Date.now() - this.lastFailureTime > this.recoveryTimeMs) {
      this.open = false; // Try after recovery time
      this.failures = 0;
      return true;
    }
    return false;
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.open = true;
      console.log('[CircuitBreaker] Circuit opened due to repeated failures.');
    }
  }

  reset() {
    this.failures = 0;
    this.open = false;
  }
}

class EmailService {
  constructor() {
    this.provider1 = new MockProvider1();
    this.provider2 = new MockProvider2();
    this.statusStore = new Map(); // emailId => status
    this.sentEmails = new Set();  // for idempotency
    this.rateLimit = { limit: 2, intervalMs: 1000 }; // 2 emails per second
    this.emailTimestamps = [];
    this.circuitBreaker = new CircuitBreaker();
  }

  async sendEmail(email) {
    if (!this.circuitBreaker.canProceed()) {
      console.log('[Error] Circuit breaker is open. Rejecting email:', email.id);
      this.statusStore.set(email.id, 'Failed - Circuit Open');
      return 'Failed - Circuit Open';
    }

    // Idempotency check
    if (this.sentEmails.has(email.id)) {
      console.log(`[Info] Duplicate email send prevented: ${email.id}`);
      return this.statusStore.get(email.id);
    }

    // Rate limiting check
    const now = Date.now();
    this.emailTimestamps = this.emailTimestamps.filter(ts => now - ts < this.rateLimit.intervalMs);
    if (this.emailTimestamps.length >= this.rateLimit.limit) {
      console.log(`[RateLimit] Too many requests. Rejecting: ${email.id}`);
      this.statusStore.set(email.id, 'Failed - Rate Limit');
      return 'Failed - Rate Limit';
    }

    this.emailTimestamps.push(now);

    // Try to send with retries and fallback
    let status = await this._sendWithRetries(email);
    this.statusStore.set(email.id, status);
    if (status === 'Failed') this.circuitBreaker.recordFailure();
    else this.circuitBreaker.reset();

    if (status === 'Success') this.sentEmails.add(email.id);

    return status;
  }

  async _sendWithRetries(email, maxRetries = 3) {
    let delay = 100;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.provider1.send(email);
      } catch (e) {
        console.log(`[Retry] Provider1 attempt ${attempt + 1} failed.`);
        await this._delay(delay);
        delay *= 2;
      }
    }
    // fallback to provider2
    delay = 100;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.provider2.send(email);
      } catch (e) {
        console.log(`[Retry] Provider2 attempt ${attempt + 1} failed.`);
        await this._delay(delay);
        delay *= 2;
      }
    }
    console.log('[Error] All providers failed for:', email.id);
    return 'Failed';
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(emailId) {
    return this.statusStore.get(emailId) || 'No status found';
  }
}

module.exports = EmailService;
