/**
 * ANALYTICS INGESTOR (Deep Tracking)
 * Odbiera zdarzenia z Pixela i zapisuje je asynchronicznie do D1.
 */
export class AnalyticsIngestor {
  static async handle(request, env) {
    try {
      const data = await request.json();

      // Walidacja podstawowa
      if (!data || !data.type) {
        return; // Ignorujemy puste strzały
      }

      // Zapis do bazy D1
      // Tabela 'analytics_events' przyjmuje surowy JSON w kolumnie 'payload',
      // dzięki czemu zachowujemy pełną głębokość danych (heatmapy, scrolle) bez sztywnej schemy.
      const stmt = env.DB.prepare(`
        INSERT INTO analytics_events (session_id, event_type, url, payload, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      await stmt.bind(
        data.sessionId || 'anon',
        data.type, // np. 'mouse_move', 'click', 'scroll_depth'
        data.url || '',
        JSON.stringify(data), // Zapisujemy wszystko co przysłał tracking.js
        new Date().toISOString()
      ).run();
    } catch (e) {
      console.error('Analytics Ingest Error:', e);
      // Błędy analityki są ciche - nie psujemy UX klienta
    }
  }
}
