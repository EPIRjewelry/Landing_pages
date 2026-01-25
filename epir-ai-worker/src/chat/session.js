import { Groq } from 'groq-sdk';
import { Ai } from '@cloudflare/ai';
import { EPIR_TOOLS } from './tools.js';
import { ShopifyService } from '../shopify/service.js';

export class ChatSession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.storage = state.storage;
    // Inicjalizacja klientów
    this.groq = new Groq({ apiKey: env.GROQ_API_KEY });
    this.ai = new Ai(env.AI);
    this.shopify = new ShopifyService(env);
    this.history = [];
  }

  async fetch(request) {
    // Odzyskanie historii z trwałego zapisu
    const storedHistory = await this.storage.get('history');
    if (storedHistory) this.history = storedHistory;

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
    // 2. SCENARIUSZ TEKSTOWY
    else {
      this.addToHistory('user', message.text);
    }

    // 3. PĘTLA WNIOSKOWANIA (Decyzja -> Narzędzia -> Odpowiedź)
    await this.runInferenceLoop(ws);
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

        try {
          if (fnName === 'get_stone_expertise') {
            toolResult = await this.shopify.getStoneExpertise(args.stone_name);
          } else if (fnName === 'search_granular_products') {
            toolResult = await this.shopify.searchGranularProducts(args);
          } else if (fnName === 'match_set_items') {
            toolResult = await this.shopify.matchSetItems(args.product_id);
          } else if (fnName === 'get_collection_story') {
            toolResult = await this.shopify.getCollectionStory(args.collection_name);
          }
        } catch (e) {
          toolResult = { error: e.message };
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
