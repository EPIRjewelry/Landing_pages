export class ProfileService {
  constructor(env) {
    this.db = env.DB;
  }

  /**
   * Atomic Insert-or-Update using Optimistic Locking.
   * Handles "Cold Start" race conditions and JSON merging.
   */
  async updateProfile(clientId, updates = {}) {
    const timestamp = Date.now();
    const { 
      email, phone, firstName, 
      context = [], preferences = {} 
    } = updates;

    // 1. Try Atomic Insert (New Guest)
    try {
      if (!clientId) throw new Error("Missing Client ID");

      const insertQuery = `
        INSERT INTO client_profiles (
          client_id, created_at, last_seen, 
          email, phone, first_name,
          ai_context, preferences
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.prepare(insertQuery)
        .bind(
          clientId, timestamp, timestamp,
          email || null, phone || null, firstName || null,
          JSON.stringify(context), JSON.stringify(preferences)
        ).run();

      return { status: 'created', lead_score: 0 };

    } catch (e) {
      // 2. Fallback to Update (Existing Guest)
      if (e.message.includes('UNIQUE constraint failed')) {
        return await this._mergeAndUpdate(clientId, updates, timestamp);
      }
      throw e; // Rethrow real errors
    }
  }

  /**
   * Smart Merge for existing profiles.
   * Uses Optimistic Locking ensures we don't overwrite parallel requests.
   */
  async _mergeAndUpdate(clientId, updates, now) {
    // A. Fetch current state (Warm Layer)
    const current = await this.db.prepare(
      `SELECT * FROM client_profiles WHERE client_id = ?`
    ).bind(clientId).first();

    if (!current) throw new Error("Profile disappeared (Race condition)");

    // B. Merge Logic
    const mergedContext = this._mergeLists(
      JSON.parse(current.ai_context || '[]'), 
      updates.context || []
    );
    
    // Simple property overwrite for scalar fields if new value provided
    const email = updates.email || current.email;
    const leadScore = Math.min(100, (current.lead_score || 0) + (updates.scoreDelta || 0));

    // C. Atomic Update with Optimistic Lock
    const updateQuery = `
      UPDATE client_profiles 
      SET 
        last_seen = ?,
        email = ?,
        lead_score = ?,
        ai_context = ?,
        total_sessions = total_sessions + 1
      WHERE client_id = ? 
      AND last_seen = ? -- Optimistic Lock
    `;

    const result = await this.db.prepare(updateQuery)
      .bind(
        now, 
        email, 
        leadScore, 
        JSON.stringify(mergedContext),
        clientId, 
        current.last_seen
      ).run();

    // D. Retry on Lock Failure
    if (result.meta.changes === 0) {
      console.warn(`Optimistic Lock failed for ${clientId}. Retrying...`);
      // Recursive retry (Max 1 usually enough)
      return this.updateProfile(clientId, updates); 
    }

    return { status: 'updated', lead_score: leadScore };
  }

  /**
   * Helper: Merges AI Context arrays (Newest wins, keep unique, limit 20)
   */
  _mergeLists(existing, incoming) {
    const combined = [...incoming, ...existing]; // Prefer new items
    // Deduplicate strings, keep objects if distinct... simplified:
    const unique = [...new Set(combined.map(item => typeof item === 'string' ? item : JSON.stringify(item)))].map(item => {
        try {
            return JSON.parse(item);
        } catch(e) {
            return item;
        }
    });

    // Fix for strings that accidentaly turn into objects via JSON.parse if they looked like JSON, 
    // but the intention above was simple string dedupe.
    // Let's make it simpler/cleaner:
    
    // Revised logic: 
    // 1. Normalize everything to string for Set uniqueness
    const seen = new Set();
    const result = [];
    
    for (const item of combined) {
        const key = typeof item === 'string' ? item : JSON.stringify(item);
        if(!seen.has(key)) {
            seen.add(key);
            result.push(item);
        }
    }
    
    return result.slice(0, 20);
  }
}
