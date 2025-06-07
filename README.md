# Email Service

This is a Node.js email sending service with the following features:

- Retry logic with exponential backoff
- Fallback to a secondary provider
- Idempotency to prevent duplicate sends
- Basic rate limiting (2 emails/second)
- Status tracking of email attempts
- Circuit breaker pattern
- Simple logging
- Basic in-memory queue

## Setup

```bash
npm install
