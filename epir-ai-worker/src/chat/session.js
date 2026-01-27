import { Groq } from 'groq-sdk';
import { Ai } from '@cloudflare/ai';
import { EPIR_TOOLS } from './tools.js';
import { ShopifyService } from '../shopify/service.js';
import { ProfileService } from './profile.js';

export class ChatSession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.storage = state.storage;
    // Inicjalizacja klientów
    this.groq = new Groq({ apiKey: env.GROQ_API_KEY });
    this.ai = new Ai(env.AI);
    this.shopify = new ShopifyService(env);
    this.profileService = new ProfileService(env);
    this.history = [];
  }

  async fetch(request) {
    const url = new URL(request.url);

    // --- INTERNAL SIGNALS (Analytics) ---
    if (url.pathname === '/internal/signal' && request.method === 'POST') {
      const data = await request.json();
      await this.handleSignal(data);
      return new Response('OK');
    }

    // Odzyskanie historii z trwałego zapisu
    const storedHistory = await this.storage.get('history');
    if (storedHistory) this.history = storedHistory;
    
    // Odzyskanie viewedProducts
    const viewedProducts = await this.storage.get('viewedProducts');
    if (viewedProducts) this.viewedProducts = viewedProducts;
    else this.viewedProducts = [];

    // Obsługa WebSocket
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    server.accept();
    server.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data);
        await this.handleMessage(server, message);
      } catch (err) {
        console.error('Chat Error:', err);
        server.send(JSON.stringify({ type: 'error', content: 'Wystąpił błąd systemu. Spróbuj ponownie.' }));
      }
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async handleMessage(ws, message) {
    // Persist or generate session id to link to SessionDO
    const sessionId = message.session_id || (await this.storage.get('session_id')) || crypto.randomUUID();
    await this.storage.put('session_id', sessionId);

    // 1. SCENARIUSZ VISION: Użytkownik wysłał zdjęcie
    if (message.type === 'image') {
      ws.send(JSON.stringify({ type: 'status', content: 'Analizuję zdjęcie...' }));

      try {
        // Używamy darmowego i szybkiego modelu Llama Vision na Cloudflare
        const imageResponse = await this.ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          image: message.imageBase64,
          prompt: 'Jesteś ekspertem jubilerskim. Opisz ten przedmiot szczegółowo. Zwróć uwagę na: rodzaj biżuterii, kolor metalu (złoto/srebro), widoczne kamienie i styl.'
        });

        // Dodajemy analizę obrazu jako kontekst systemowy do historii
        this.addToHistory('system', `[VISION_ANALYSIS]: Użytkownik przesłał zdjęcie. AI widzi: ${imageResponse.response}`);
        // Potwierdzenie dla użytkownika (opcjonalne, bo AI zaraz odpowie tekstowo)
      } catch (e) {
        console.error('Vision Error:', e);
        this.addToHistory('system', `[VISION_ERROR]: Nie udało się przeanalizować zdjęcia. Błąd: ${e.message}`);
      }
    }
    // 3. SCENARIUSZ HANDSHAKE (Powiązanie ClientID z SessionID)
    else if (message.type === 'register_client') {
      const clientId = message.clientId;
      const sessionId = this.state.id.toString(); // ID sesji DO

      if (clientId && this.env.DB) {
        try {
          // A. Mapowanie sesji (Legacy/Operational)
          await this.env.DB.prepare(
            `INSERT OR REPLACE INTO customer_sessions (client_id, session_id) VALUES (?, ?)`
          ).bind(clientId, sessionId).run();
          
          // B. Profile Persistence (Golden Record)
          // Inicjalizacja/Touch profilu przy wejściu z obsługą Optimistic Locking
          await this.profileService.updateProfile(clientId, {
             email: message.email,
             firstName: message.firstName,
             phone: message.phone
          });
          
          this.addToHistory('system', `[DEBUG]: Powiązano klienta ${clientId} z sesją i zaktualizowano profil.`);

          // --- AUTO CLEANUP CONFIGURATION ---
          // Zapisz dane do cleanupa
          await this.storage.put('mapped_client_id', clientId);
          await this.storage.put('last_mapping_activity', Date.now());

          // Ustaw alarm cleanupu (5 min), o ile nie ma pilniejszego alarmu (np. flush zdarzeń)
          const currentAlarm = await this.storage.getAlarm();
          const cleanupTime = Date.now() + 5 * 60 * 1000;
          
          if (!currentAlarm || currentAlarm > cleanupTime) {
              await this.storage.setAlarm(cleanupTime);
          }
        } catch (e) {
          console.error('Mapping Error:', e);
        }
      }
    }
    // 4. SCENARIUSZ TEKSTOWY
    else {
      this.addToHistory('user', message.text);
    }

    // 5. PĘTLA WNIOSKOWANIA (Decyzja -> Narzędzia -> Odpowiedź)
    // Tylko dla wiadomości tekstowych/obrazkowych, nie dla pingów
    if (message.type !== 'register_client') {
      await this.runInferenceLoop(ws);
    }
  }

  // --- PERSISTENCE & ANALYTICS LAYERS ---

  /**
   * HOT PATH: Obsługa sygnałów z Pixela (product_viewed, collection_viewed)
   * Aktualizuje stan pamięci (viewedProducts) dla szybkiego dostępu przez LLM.
   */
  async handleSignal(signal) {
    const { type, payload } = signal;
    
    // Log do D1 (Warm Path)
    await this.logChatEvent(type, payload);

    // Aktualizacja stanu Hot (InMemory/DO Storage)
    if (type === 'product_viewed') {
      const product = typeof payload === 'string' ? JSON.parse(payload) : payload;
      
      // Init if missing
      if (!this.viewedProducts) this.viewedProducts = [];
      
      // Unikamy duplikatów (ostatnie 5)
      this.viewedProducts = [product, ...this.viewedProducts.filter(p => p.url !== product.url)].slice(0, 5);
      
      await this.storage.put('viewedProducts', this.viewedProducts);
      
      // Opcjonalnie: Jeśli klient jest w trakcie rozmowy, możemy wysłać powiadomienie
      // this.broadcast({ type: 'debug', content: `Widzę, że przeglądasz: ${product.title}` });
    }

    // Cold Path Trigger: Ustawienie alarmu na flush do BigQuery
    // Micro-batching: Alarm za 60 sekund od pierwszego zdarzenia
    const currentAlarm = await this.storage.getAlarm();
    if (currentAlarm === null) {
      await this.storage.setAlarm(Date.now() + 60 * 1000);
    }
  }

  /**
   * WARM PATH: Zapis interakcji do D1
   */
  async logChatEvent(type, payload) {
    try {
      const sessionId = await this.storage.get('session_id') || 'unknown';
      const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      if (this.env.DB) {
        await this.env.DB.prepare(
          `INSERT INTO events (session_id, type, payload) VALUES (?, ?, ?)`
        ).bind(sessionId, type, payloadStr).run();
      }
    } catch (e) {
      console.error('Failed to log chat event:', e);
    }
  }

  /**
   * COLD PATH: Zrzut danych do BigQuery (Alarm)
   */
  async alarm() {
    // 1. Flush Events to BigQuery
    await this.flushToBigQuery();

    // 2. Cleanup Old Mappings
    await this.cleanupMappings();
  }

  async cleanupMappings() {
    const lastActivity = await this.storage.get('last_mapping_activity');
    const clientId = await this.storage.get('mapped_client_id');
    
    if (!lastActivity || !clientId) return;
    
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 min
    
    // Sprawdź czy czas minął
    if (now - lastActivity > timeout) {
        try {
            // Skasuj mapowanie w D1
            if (this.env.DB) {
                await this.env.DB.prepare(
                    'DELETE FROM customer_sessions WHERE client_id = ? AND session_id = ?'
                ).bind(clientId, this.state.id.toString()).run();
            }
            // Wyczyść storage
            await this.storage.delete(['mapped_client_id', 'last_mapping_activity']);
            // console.log(`[Cleaner] Removed mapping for ${clientId}`);
        } catch(e) { 
            console.error('Cleanup error', e); 
        }
    } else {
        // Jeśli czas nie minął (np. alarm obudził się na flush events),
        // upewnij się, że alarm na cleanup jest ustawiony ponownie na przyszłość.
        const nextCheck = lastActivity + timeout;
        
        // Nie nadpisuj, jeśli mamy coś pilniejszego (choć tu jesteśmy PO flushu, więc kolejka pusta?)
        // Bezpieczniej: zawsze ustaw na przewidywany koniec sesji. 
        // Jeśli w międzyczasie wpadnie event -> handleSignal przestawi alarm na +60s (czyli wcześniej) -> OK.
        await this.storage.setAlarm(nextCheck);
    }
  }

  async flushToBigQuery() {
    const sessionId = await this.storage.get('session_id');
    if (!sessionId) return;

    try {
      // 1. Pobierz nieprzetworzone eventy dla tej sesji
      // Limit 100 dla batcha
      const { results } = await this.env.DB.prepare(
        `SELECT * FROM events WHERE session_id = ? AND processed_at IS NULL LIMIT 100`
      ).bind(sessionId).run();

      if (!results || results.length === 0) return;

      // 2. Wyślij do BigQuery (Low-Level Fetch z Workload Identity lub Service Account Token)
      // Tutaj zakładam, że ENV.BIGQUERY_ENDPOINT wskazuje na proxy autoryzujące lub bezpośrednie API Google
      // W wersji "Brak kluczy JSON", endpoint targetuje naszego Workera z bindingiem analytics-engine lub 
      // zewnętrzny serwis CloudRun z Workload Identity Federation.
      // DLA UPROSZCZENIA (zgodnie z poleceniem): Native fetch na endpoint.
      
      if (this.env.BIGQUERY_ENDPOINT) {
         const response = await fetch(this.env.BIGQUERY_ENDPOINT, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ 
             rows: results.map(r => ({ json: r, insertId: r.id.toString() })) 
           })
         });

         if (!response.ok) {
           throw new Error(`BigQuery Flush Failed: ${response.status}`);
         }
      }

      // 3. Zaktualizuj processed_at
      const ids = results.map(r => r.id).join(',');
      await this.env.DB.prepare(
        `UPDATE events SET processed_at = CURRENT_TIMESTAMP WHERE id IN (${ids})`
      ).run();

      // Reset alarmu, jeśli są jeszcze jakieś dane (recursive batching)
      // await this.storage.setAlarm(Date.now() + 10 * 1000); 

    } catch (e) {
      console.error('Alarm/Flush Error:', e);
      // Retry logic: set alarm again logic needed? 
      // For now, let it fail safely.
    }
  }

  // Główna pętla decyzyjna "Neuro-Symboliczna"
  async runInferenceLoop(ws) {
    const systemPrompt = {
      role: 'system',
      content: `Jesteś Ekspertem Jubilerskim marki EPIR. Twoim celem jest profesjonalne doradztwo i sprzedaż.
      Masz dostęp do danych sklepu poprzez Narzędzia (Tools).
      
      ZASADY OPERACYJNE:
      1. FAKTY: Jeśli klient pyta o właściwości kamienia (trwałość, historia), MUSISZ użyć 'get_stone_expertise'. Nie zmyślaj.
      2. PRODUKTY: Jeśli klient szuka biżuterii, użyj 'search_granular_products' z precyzyjnymi filtrami (np. metal_type: "Złoto 585").
      3. KOMPLETY: Jeśli klient pyta "co pasuje do tego?", użyj 'match_set_items'.
      4. HISTORIA: Jeśli klient pyta o kolekcję (np. Van Gogh), użyj 'get_collection_story'.
      
      STYL ROZMOWY:
      Bądź uprzejmy, elegancki, ale konkretny. Odpowiadaj krótko i na temat. Używaj języka polskiego.`
    };

    // KROK A: Pierwsze myślenie (LLM decyduje, czy potrzebuje narzędzi)
    let response = await this.groq.chat.completions.create({
      messages: [systemPrompt, ...this.history],
      model: 'llama3-70b-8192', // Bardzo szybki model tekstowy
      tools: EPIR_TOOLS,
      tool_choice: 'auto'
    });

    let message = response.choices[0].message;

    // KROK B: Obsługa narzędzi (jeśli AI "podniosło rękę")
    if (message.tool_calls && message.tool_calls.length > 0) {
      // 1. Dodajemy "intencję" AI do historii
      this.history.push(message);

      ws.send(JSON.stringify({ type: 'status', content: 'Sprawdzam w bazie EPIR...' }));

      // 2. Wykonujemy wszystkie zlecone narzędzia
      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult = { error: 'Unknown tool' };

        console.log(`[AI Tool Exec] ${fnName}`, args);

        // Retrieve sessionId and context from SessionDO (if available)
        const sessionId = (await this.storage.get('session_id')) || null;
        let sessionContext = {};
        try {
          if (sessionId && this.env && this.env.SESSION) {
            const doId = this.env.SESSION.idFromName(sessionId);
            const stub = this.env.SESSION.get(doId);
            const resp = await stub.fetch('https://session/get');
            if (resp.ok) sessionContext = await resp.json();
          }
        } catch (e) {
          console.warn('Failed to fetch session context', e);
        }

        try {
          if (fnName === 'get_stone_expertise') {
            toolResult = await this.shopify.getStoneExpertise(args.stone_name);
            // Context-aware hint: if user recently viewed same stone, add suggestion
            const recentlyViewed = (sessionContext.pixel_events || []).filter(e => e.event === 'product_viewed').slice(-5);
            const viewedStones = recentlyViewed.map(e => (e.main_stone || '').toString().toLowerCase()).filter(Boolean);
            if (viewedStones.includes(String(args.stone_name || '').toLowerCase())) {
              toolResult.context_message = `Zauważyłem, że oglądałeś produkty z ${args.stone_name}. `;
            }
          } else if (fnName === 'search_granular_products') {
            // If filters missing, try infer from session chat history
            const paramsWithContext = { ...args };
            if (!paramsWithContext.filters && Array.isArray(sessionContext.chat_history) && sessionContext.chat_history.length > 0) {
              const lastMsg = (sessionContext.chat_history.slice(-1)[0] || '').toString().toLowerCase();
              if (lastMsg.includes('rocznic')) {
                paramsWithContext.filters = { occasion_type: 'anniversary' };
              }
            }
            toolResult = await this.shopify.searchGranularProducts(paramsWithContext);
          } else if (fnName === 'match_set_items') {
            toolResult = await this.shopify.matchSetItems(args.product_id);
          } else if (fnName === 'get_collection_story') {
            toolResult = await this.shopify.getCollectionStory(args.collection_name);
          }
        } catch (e) {
          toolResult = { error: e.message };
        }

        // Log tool call into Session DO for analytics and context
        try {
          if (sessionId && this.env && this.env.SESSION) {
            const doId = this.env.SESSION.idFromName(sessionId);
            const stub = this.env.SESSION.get(doId);
            await stub.fetch('https://session/update', {
              method: 'POST',
              body: JSON.stringify({ type: 'tool_call', tool: fnName, params: args, result: toolResult })
            });
          }
        } catch (e) {
          console.warn('Failed to log tool call to session DO', e);
        }

        // 3. Dodajemy wynik ("dowód") do historii
        this.history.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: fnName,
          content: JSON.stringify(toolResult)
        });
      }

      // KROK C: Drugie myślenie (Synteza wiedzy z narzędzi)
      response = await this.groq.chat.completions.create({
        messages: [systemPrompt, ...this.history],
        model: 'llama3-70b-8192'
      });

      message = response.choices[0].message;
    }

    // KROK D: Finalna odpowiedź dla użytkownika
    const reply = message.content;
    this.addToHistory('assistant', reply);

    // Zapis stanu (persistence)
    await this.storage.put('history', this.history);

    ws.send(JSON.stringify({ type: 'text', content: reply }));
  }

  addToHistory(role, content) {
    // Prosta retencja historii (ostatnie 20 wiadomości, żeby nie zapchać kontekstu)
    if (this.history.length > 20) {
      this.history = this.history.slice(-20);
    }
    this.history.push({ role, content });
  }
}
