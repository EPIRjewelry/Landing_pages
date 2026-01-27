export class CacheManager {
  constructor(cache = caches.default) {
    this.cache = cache;
  }

  async getCached(key, fetcher, ttlSeconds) {
    try {
      const cached = await this.cache.match(key);
      if (cached) {
        return { response: cached, hit: true };
      }

      const fresh = await fetcher();
      const response = new Response(fresh.body, fresh);
      response.headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
      await this.cache.put(key, response.clone());
      return { response, hit: false };
    } catch (error) {
      console.warn('Cache API unavailable, bypassing:', error);
      const response = await fetcher();
      return { response, hit: false };
    }
  }
}
