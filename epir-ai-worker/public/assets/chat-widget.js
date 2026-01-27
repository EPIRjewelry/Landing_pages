class EpirChatWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: system-ui, sans-serif; }
        .epir-chat-container { position: relative; }
        .epir-chat-trigger { background: #111; color: #fff; border: none; border-radius: 999px; padding: 12px 16px; cursor: pointer; }
        .epir-chat-window { position: absolute; right: 0; bottom: 52px; width: 320px; height: 420px; background: #fff; border: 1px solid #ddd; border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.2); display: flex; flex-direction: column; }
      </style>
      <div class="epir-chat-container">
        <button class="epir-chat-trigger" type="button">💬</button>
        <div class="epir-chat-window" hidden>
          <div style="padding:12px;border-bottom:1px solid #eee;font-weight:600;">EPIR Asystent</div>
          <div id="messages" style="flex:1; padding:12px; overflow:auto; font-size:14px;"></div>
          <form id="form" style="display:flex; gap:8px; padding:12px; border-top:1px solid #eee;">
            <input id="input" type="text" placeholder="Napisz wiadomość..." style="flex:1; padding:8px;" />
            <button type="submit">Wyślij</button>
          </form>
        </div>
      </div>
    `;

    this.shadowRoot.querySelector('.epir-chat-trigger').addEventListener('click', () => {
      const windowEl = this.shadowRoot.querySelector('.epir-chat-window');
      windowEl.hidden = !windowEl.hidden;
    });

    this.shadowRoot.querySelector('#form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = this.shadowRoot.querySelector('#input');
      const messages = this.shadowRoot.querySelector('#messages');
      const text = input.value.trim();
      if (!text) return;
      messages.innerHTML += `<div><strong>Ty:</strong> ${text}</div>`;
      input.value = '';

      try {
        const response = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: crypto.randomUUID(),
            method: 'search_products',
            params: { occasion_type: 'anniversary' }
          })
        });
        const data = await response.json();
        messages.innerHTML += `<div><strong>EPIR:</strong> ${JSON.stringify(data.result)}</div>`;
      } catch (e) {
        messages.innerHTML += `<div><strong>EPIR:</strong> Przepraszam, nie mogę teraz odpowiedzieć.</div>`;
      }
    });
  }
}

customElements.define('epir-chat-widget', EpirChatWidget);
