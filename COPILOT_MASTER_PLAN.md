# **EPIR AI PLATFORM v3: KONTEKST PROJEKTOWY DLA COPILOTA**

## **1\. MISJA I ARCHITEKTURA**

Budujemy "Neuro-Symbolicznego" Agenta AI dla sklepu jubilerskiego EPIR.  
Celem nie jest prosty chatbot, ale **System Operacyjny Sklepu**, który łączy:

* **Szybkość:** Cloudflare Workers \+ Durable Objects.  
* **Inteligencję:** Groq (LLM) \+ Llama Vision (Analiza zdjęć).  
* **Wiedzę:** Dane strukturalne Shopify (Metafields & Metaobjects) dostępne przez MCP (Model Context Protocol).

**Główna zasada:** Agent nie zgaduje. Agent sprawdza fakty w Shopify (twardość kamieni, dostępność zestawów) zanim odpowie.

## **2\. STRUKTURA KATALOGÓW (MONOREPO)**

Pracujemy w nowym katalogu (należy go utworzyć, jeśli nie istnieje), np. /epir-ai-worker. Nie modyfikujemy istniejących folderów hydrogen-landing ani epir-landing (chyba że w celu wpięcia widgetu).  
Docelowa struktura Agenta v3:  
/epir-ai-worker  
├── wrangler.toml          \# Infrastruktura (D1, AI, Durable Objects)  
├── src  
│   ├── worker.js          \# Gateway (Router ruchu)  
│   ├── chat  
│   │   ├── session.js     \# Mózg (Durable Object \+ Groq \+ Tool Loop)  
│   │   └── tools.js       \# Definicje narzędzi MCP (JSON Schema)  
│   ├── shopify  
│   │   └── service.js     \# Ręce (GraphQL Service, Metafields logic)  
│   ├── analytics  
│   │   └── ingestor.js    \# Analityka (Fire-and-forget)  
│   └── landing  
│       └── handler.js     \# Inteligentne Proxy dla Landing Page  
└── public  
    └── assets             \# Widget JS

## **3\. ŹRÓDŁO PRAWDY (GOLDEN MASTER CODE)**

Poniższy kod został zatwierdzony jako **Wersja RC1**. Używaj go jako wzorca przy generowaniu plików. Nie zmieniaj logiki biznesowej bez wyraźnego polecenia.

### **A. Infrastruktura (wrangler.toml)**

Definiuje bindingi do AI, Bazy Danych i Durable Objects.  
name \= "epir-ai-platform-v3"  
main \= "src/worker.js"  
compatibility\_date \= "2024-01-01"

\[vars\]  
SHOPIFY\_STORE\_URL \= "epir-bizuteria.myshopify.com"  
SHOPIFY\_API\_VERSION \= "2024-01"  
SYSTEM\_PROMPT\_VERSION \= "v3\_semantic\_epir"

\[ai\]  
binding \= "AI"

\[\[d1\_databases\]\]  
binding \= "DB"  
database\_name \= "epir-analytics-prod"  
database\_id \= "TODO\_INSERT\_ID"

\[\[durable\_objects\].bindings\]  
name \= "CHAT\_SESSIONS"  
class\_name \= "ChatSession"

\[\[migrations\]\]  
tag \= "v1"  
new\_classes \= \["ChatSession"\]

### **B. Mózg z Narzędziami (src/chat/session.js)**

To jest kluczowy element "Neuro-Symboliczny". AI decyduje, czy użyć narzędzia, a Worker je wykonuje.  
import { Groq } from 'groq-sdk';  
import { Ai } from '@cloudflare/ai';  
import { EPIR\_TOOLS } from './tools.js';  
import { ShopifyService } from '../shopify/service.js';

export class ChatSession {  
  constructor(state, env) {  
    this.state \= state;  
    this.env \= env;  
    this.storage \= state.storage;  
    this.groq \= new Groq({ apiKey: env.GROQ\_API\_KEY });  
    this.ai \= new Ai(env.AI);  
    this.shopify \= new ShopifyService(env);  
    this.history \= \[\];  
  }

  async fetch(request) {  
    // ... (WebSocket handshake logic) ...  
    // Przychodzące wiadomości trafiają do runInferenceLoop()  
  }

  async runInferenceLoop(ws) {  
    const systemPrompt \= {  
      role: 'system',  
      content: \`Jesteś Ekspertem Jubilerskim EPIR.  
      ZASADY:  
      1\. Fakty o kamieniach \-\> get\_stone\_expertise  
      2\. Szukanie produktu \-\> search\_granular\_products  
      3\. Cross-sell \-\> match\_set\_items\`  
    };

    // 1\. Decyzja LLM  
    let response \= await this.groq.chat.completions.create({  
      messages: \[systemPrompt, ...this.history\],  
      model: 'llama3-70b-8192',  
      tools: EPIR\_TOOLS,  
      tool\_choice: "auto"  
    });

    let message \= response.choices\[0\].message;

    // 2\. Wykonanie Narzędzi (jeśli potrzebne)  
    if (message.tool\_calls) {  
      this.history.push(message);  
      for (const toolCall of message.tool\_calls) {  
        const fn \= toolCall.function.name;  
        const args \= JSON.parse(toolCall.function.arguments);  
        let result;  
          
        if (fn \=== 'get\_stone\_expertise') result \= await this.shopify.getStoneExpertise(args.stone\_name);  
        else if (fn \=== 'search\_granular\_products') result \= await this.shopify.searchGranularProducts(args);  
        else if (fn \=== 'match\_set\_items') result \= await this.shopify.matchSetItems(args.source\_product\_id, args.set\_reference\_id);  
          
        this.history.push({ role: "tool", content: JSON.stringify(result), tool\_call\_id: toolCall.id });  
      }  
      // 3\. Synteza po pobraniu danych  
      response \= await this.groq.chat.completions.create({ messages: \[systemPrompt, ...this.history\], model: 'llama3-70b-8192' });  
      message \= response.choices\[0\].message;  
    }

    // 4\. Odpowiedź  
    ws.send(JSON.stringify({ type: 'text', content: message.content }));  
  }  
}

### **C. Logika Shopify (src/shopify/service.js)**

Tłumacz zapytań AI na GraphQL Shopify.  
Kluczowe metody do zaimplementowania:

1. getStoneExpertise(stoneName): Pobiera dane z Metaobject stone\_profile (pola: hardness, mythology, care\_instructions).  
2. searchGranularProducts(filters): Buduje query do Search API używając Metafields (custom.main\_stone, custom.metal\_type).  
3. matchSetItems(productId): Szuka produktów powiązanych przez custom.set\_reference.

## **4\. MODEL DANYCH (SHOPIFY) \- KONTEKST**

Agent musi wiedzieć, jak nazywają się pola w Shopify, aby poprawnie konstruować zapytania.

* **Metaobject stone\_profile**: Baza wiedzy o kamieniach.  
* **Metafield custom.main\_stone**: Lista (np. "Opal", "Diament").  
* **Metafield custom.set\_reference**: ID zestawu (np. "VG-001").  
* **Metafield custom.stone\_education**: Referencja do stone\_profile.

## **5\. INSTRUKCJA OPERACYJNA DLA COPILOTA**

1. Zacznij od utworzenia struktury plików w /epir-ai-worker.  
2. Zainstaluj zależności: npm install groq-sdk @cloudflare/ai.  
3. Wygeneruj pliki źródłowe (worker.js, session.js, service.js) opierając się dokładnie na kodzie z sekcji 3\.  
4. Pamiętaj o obsłudze błędów w komunikacji z API Shopify (GraphQL).