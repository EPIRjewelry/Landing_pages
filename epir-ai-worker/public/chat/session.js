import { tools } from './tools.js';

export class ChatSession {
  constructor() {
    this.history = [];
  }

  async handleUserMessage(text) {
    this.history.push({ role: 'user', content: text });

    // Placeholder: integracja z AI w workerze - tu tylko pseudo-logika
    if (text.toLowerCase().includes('kamień')) {
      const result = await tools.get_stone_expertise('ametyst');
      return `Ametyst: ${result?.mythology || 'brak danych'}`;
    }

    return 'Dziękuję za wiadomość! Jak mogę pomóc dalej?';
  }
}
