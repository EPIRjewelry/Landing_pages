export class SessionDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.storage = state.storage;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/session/update') {
      const data = await request.json();
      return this.updateSession(data);
    }

    if (url.pathname === '/session/get') {
      return this.getSession();
    }

    if (url.pathname === '/session/flush') {
      return this.flushToBigQuery();
    }

    return new Response('Not Found', { status: 404 });
  }

  async updateSession(data) {
    const session = (await this.storage.get('session')) || {
      id: crypto.randomUUID(),
      chat_history: [],
      pixel_events: [],
      tool_calls: [],
      created_at: Date.now()
    };

    if (data?.type === 'chat_message' && data.message) {
      session.chat_history.push(data.message);
    }

    if (data?.type === 'pixel_event' && data.event) {
      session.pixel_events.push({
        event: data.event,
        product_id: data.product_id || null,
        timestamp: Date.now()
      });
    }

    if (data?.type === 'tool_call' && data.tool) {
      session.tool_calls.push({
        tool: data.tool,
        params: data.params || null,
        result: data.result || null,
        timestamp: Date.now()
      });
    }

    await this.storage.put('session', session);

    const totalEvents =
      session.chat_history.length + session.pixel_events.length + session.tool_calls.length;

    if (totalEvents >= 50) {
      await this.scheduleFlush();
    }

    return new Response(JSON.stringify({ ok: true, session_id: session.id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getSession() {
    const session = await this.storage.get('session');
    return new Response(JSON.stringify(session || null), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async scheduleFlush() {
    await this.storage.setAlarm(Date.now() + 30000);
  }

  async alarm() {
    await this.flushToBigQuery();
  }

  async flushToBigQuery() {
    const session = await this.storage.get('session');
    if (!session) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { 'Content-Type': 'application/json' } });

    if (!this.env.DB) {
      console.warn('D1 binding missing: DB');
      return new Response(JSON.stringify({ ok: false, error: 'DB binding missing' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const stmt = this.env.DB.prepare(
      'INSERT INTO events (session_id, event_type, event_data, timestamp) VALUES (?, ?, ?, ?)'
    );

    const now = Date.now();
    const batch = [];

    for (const msg of session.chat_history) {
      batch.push(stmt.bind(session.id, 'chat_message', JSON.stringify(msg), now));
    }

    for (const event of session.pixel_events) {
      batch.push(stmt.bind(session.id, 'pixel_event', JSON.stringify(event), event.timestamp || now));
    }

    for (const call of session.tool_calls) {
      batch.push(stmt.bind(session.id, 'tool_call', JSON.stringify(call), call.timestamp || now));
    }

    if (batch.length > 0) {
      await this.env.DB.batch(batch);
    }

    if (this.env.BIGQUERY_ENDPOINT && this.env.GCP_SERVICE_ACCOUNT_KEY) {
      await fetch(this.env.BIGQUERY_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.GCP_SERVICE_ACCOUNT_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session.id,
          events: [
            ...session.chat_history.map((m) => ({ type: 'chat', data: m })),
            ...session.pixel_events.map((e) => ({ type: 'pixel', data: e })),
            ...session.tool_calls.map((c) => ({ type: 'tool', data: c }))
          ]
        })
      });
    }

    session.chat_history = session.chat_history.slice(-10);
    session.pixel_events = session.pixel_events.slice(-10);
    session.tool_calls = session.tool_calls.slice(-10);

    await this.storage.put('session', session);

    console.log(
      JSON.stringify({
        level: 'info',
        action: 'flush_to_bigquery',
        session_id: session.id,
        events_count: batch.length
      })
    );

    return new Response(JSON.stringify({ ok: true, events_count: batch.length }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
