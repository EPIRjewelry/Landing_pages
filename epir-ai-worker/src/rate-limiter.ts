export class RateLimiterDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.storage = state.storage;
    this.maxTokens = 60;
    this.refillRatePerSec = 1; // 60 req/min
  }

  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    let payload = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    const tokensRequested = Number(payload.tokens || 1);
    const now = Date.now();
    const bucket = (await this.storage.get('bucket')) || {
      tokens: this.maxTokens,
      lastRefill: now
    };

    const elapsedSeconds = Math.max(0, (now - bucket.lastRefill) / 1000);
    const refilled = Math.min(this.maxTokens, bucket.tokens + elapsedSeconds * this.refillRatePerSec);
    const allowed = refilled >= tokensRequested;
    const remaining = allowed ? refilled - tokensRequested : refilled;

    await this.storage.put('bucket', {
      tokens: remaining,
      lastRefill: now
    });

    return new Response(JSON.stringify({ allowed, remaining }), {
      status: allowed ? 200 : 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
