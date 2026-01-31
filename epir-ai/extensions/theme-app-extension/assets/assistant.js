// extensions/theme-app-extension/assets/assistant.js
// Klient czatu z obsługą streaming SSE/JSON + FALLBACK (Autonaprawa widoczności)

/* ===== CART INTEGRATION ===== */
async function getShopifyCartId() {
  try {
    const cartRes = await fetch('/cart.js', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!cartRes.ok) return null;
    const cartData = await cartRes.json();
    if (cartData && cartData.token) {
      return `gid://shopify/Cart/${cartData.token}`;
    }
    return null;
  } catch (err) {
    console.warn('[Assistant] getShopifyCartId error', err);
    return null;
  }
}

function parseAssistantResponse(text) {
  const actions = {
    hasCheckoutUrl: false,
    checkoutUrl: null,
    hasCartUpdate: false,
    cartItems: [],
    hasOrderStatus: false,
    orderDetails: null
  };
  
  let cleanedText = text;
  cleanedText = cleanedText
    .replace(/<\|call\|>[\s\S]*?<\|end\|>/g, '')
    .replace(/<\|return\|>[\s\S]*?<\|end\|>/g, '')
    .replace(/<\|.*?\|>/g, '')
    .trim();
  
  const checkoutUrlMatch = text.match(/https:\/\/[^\s]+\/checkouts\/[^\s]+/);
  if (checkoutUrlMatch) {
    actions.hasCheckoutUrl = true;
    actions.checkoutUrl = checkoutUrlMatch[0];
  }
  
  const cartActionMatch = text.match(/\[CART_UPDATED:([^\]]+)\]/);
  if (cartActionMatch) {
    actions.hasCartUpdate = true;
    cleanedText = cleanedText.replace(/\[CART_UPDATED:[^\]]+\]/, '').trim();
  }
  
  const orderStatusMatch = text.match(/\[ORDER_STATUS:([^\]]+)\]/);
  if (orderStatusMatch) {
    actions.hasOrderStatus = true;
    try {
      actions.orderDetails = JSON.parse(orderStatusMatch[1]);
    } catch (e) {}
    cleanedText = cleanedText.replace(/\[ORDER_STATUS:[^\]]+\]/, '').trim();
  }
  return { text: cleanedText, actions };
}

function renderCheckoutButton(checkoutUrl, messageEl) {
  const btn = document.createElement('a');
  btn.href = checkoutUrl;
  btn.className = 'epir-checkout-button';
  btn.textContent = 'Przejdź do kasy →';
  btn.setAttribute('target', '_blank');
  btn.setAttribute('rel', 'noopener noreferrer');
  messageEl.appendChild(document.createElement('br'));
  messageEl.appendChild(btn);
}

// ===== GŁÓWNA INICJALIZACJA Z FALLBACKIEM =====
document.addEventListener('DOMContentLoaded', () => {
  try {
    let section = document.getElementById('epir-assistant-section');
    
    // --- FALLBACK: Jeśli widget nie został dodany w Theme Editorze, stwórz go ręcznie ---
    if (!section) {
      console.log('[EPIR Assistant] Widget container missing, injecting fallback...');
      section = document.createElement('div');
      section.id = 'epir-assistant-section';
      section.className = 'epir-assistant epir-assistant-section epir-assistant--bottom-right';
      section.setAttribute('aria-live', 'polite');
      section.dataset.shopDomain = window.Shopify ? window.Shopify.shop : window.location.hostname;
      section.dataset.workerEndpoint = '/apps/assistant/chat';
      section.dataset.startClosed = 'true';

      section.innerHTML = `
        <style>#epir-assistant-section .assistant-form button { background-color: #8B7D6A; }</style>
        <div class="assistant-container">
          <div class="assistant-header">
             <h3>Doradca EPIR-ART</h3>
             <button id="assistant-toggle-button">Otwórz</button>
          </div>
          <div id="assistant-content" class="assistant-content is-closed">
             <div id="assistant-messages" class="assistant-messages">
                <div class="msg msg-assistant welcome-message">Witaj! W czym mogę pomóc?</div>
             </div>
             <form id="assistant-form" class="assistant-form">
                <input id="assistant-input" type="text" placeholder="Zadaj pytanie..." required autocomplete="off">
                <button type="submit" id="assistant-send-button">Wyślij</button>
             </form>
             <div id="assistant-loader" class="assistant-loader is-hidden"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>
          </div>
        </div>
      `;
      document.body.appendChild(section);
      
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = window.epirAssistantCssUrl || '/apps/assistant/assets/assistant.css';
      document.head.appendChild(cssLink);
    }
    // --- KONIEC FALLBACKU ---

    const toggle = document.getElementById('assistant-toggle-button');
    const content = document.getElementById('assistant-content');
    const startClosed = section.dataset.startClosed === 'true';
    
    if (startClosed && content) content.classList.add('is-closed');
    
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isClosed = content && content.classList.toggle('is-closed');
        toggle.setAttribute('aria-expanded', isClosed ? 'false' : 'true');
      });
    }

    // Obsługa formularza (Submit)
    const form = document.querySelector('#assistant-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const input = document.querySelector('#assistant-input');
        const messagesEl = document.querySelector('#assistant-messages');
        const text = (input && input.value && input.value.trim()) || '';
        
        if (!text || !messagesEl) return;
        
        input.value = '';
        const controller = new AbortController();
        const setLoading = (b) => {
          const loader = document.getElementById('assistant-loader');
          if (loader) {
             if(b) loader.classList.remove('is-hidden'); 
             else loader.classList.add('is-hidden');
          }
        };

        // Konstrukcja endpointu
        let endpoint = section.dataset.workerEndpoint || '/apps/assistant/chat';
        const params = new URLSearchParams();
        if (section.dataset.shopDomain) params.set('shop', section.dataset.shopDomain);
        if (section.dataset.loggedInCustomerId) params.set('logged_in_customer_id', section.dataset.loggedInCustomerId);
        
        if (!endpoint.includes('?')) {
            const paramStr = params.toString();
            if (paramStr) endpoint = `${endpoint}?${paramStr}`;
        }

        await sendMessageToWorker(text, endpoint, 'epir-assistant-session', messagesEl, setLoading, controller);
      });
    }

  } catch (e) {
    console.warn('Assistant init error', e);
  }
});

/* Helpery UI */
function createAssistantMessage(messagesEl) {
  const id = `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const div = document.createElement('div');
  div.className = 'msg msg-assistant msg-typing';
  div.id = id;
  div.setAttribute('role', 'status');
  div.textContent = '...';
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return { id, el: div };
}

function updateAssistantMessage(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  const parent = el.parentElement;
  if (parent) parent.scrollTop = parent.scrollHeight;
}

function finalizeAssistantMessage(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('msg-typing');
}

function createUserMessage(messagesEl, text) {
  const div = document.createElement('div');
  div.className = 'msg msg-user';
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* SSE Streaming Processor */
async function processSSEStream(body, msgId, sessionIdKey, onUpdate) {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let index;
      while ((index = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);

        const lines = rawEvent.split(/\r?\n/);
        const dataLines = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5));
        const dataStr = dataLines.join('\n').trim();
        if (!dataStr || dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.session_id) try { sessionStorage.setItem(sessionIdKey, parsed.session_id); } catch {}
          
          if (parsed.delta !== undefined) {
             onUpdate(parsed.delta, parsed);
          } else if (parsed.content !== undefined) {
             onUpdate(parsed.content, parsed);
          }
        } catch (e) { console.error('SSE parse error', e); }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

/* Funkcja wysyłająca wiadomość */
async function sendMessageToWorker(text, endpoint, sessionIdKey, messagesEl, setLoading, controller) {
  setLoading(true);
  createUserMessage(messagesEl, text);
  const { id: msgId } = createAssistantMessage(messagesEl);
  let accumulated = '';

  try {
    const cartId = await getShopifyCartId();
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({
        message: text,
        session_id: sessionStorage.getItem(sessionIdKey),
        cart_id: cartId,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Błąd serwera: ${res.status}`);

    if (res.headers.get('content-type')?.includes('text/event-stream')) {
        await processSSEStream(res.body, msgId, sessionIdKey, (chunk) => {
            accumulated += chunk;
            const { text: clean } = parseAssistantResponse(accumulated);
            updateAssistantMessage(msgId, clean);
        });
    } else {
        const data = await res.json();
        accumulated = data.reply || data.error || 'Brak odpowiedzi';
        updateAssistantMessage(msgId, parseAssistantResponse(accumulated).text);
    }
    
    const { actions } = parseAssistantResponse(accumulated);
    if (actions.hasCheckoutUrl && actions.checkoutUrl) {
        renderCheckoutButton(actions.checkoutUrl, document.getElementById(msgId));
    }
    if (actions.hasCartUpdate) {
        document.dispatchEvent(new CustomEvent('cart:refresh'));
    }

  } catch (err) {
    updateAssistantMessage(msgId, "Przepraszam, wystąpił problem z połączeniem.");
    console.error(err);
  } finally {
    finalizeAssistantMessage(msgId);
    setLoading(false);
  }
}