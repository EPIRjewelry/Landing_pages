/**
 * Cloudflare Worker skeleton: gate for Figma webhooks
 * Receives Figma webhook events, filters, and (optionally) triggers a repo_dispatch to GitHub
 * NOTE: This is a skeleton — add secrets in Cloudflare dashboard and implement security checks
 */

addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

async function handle(request) {
  if (request.method !== 'POST') return new Response('OK', { status: 200 })

  let body
  try {
    body = await request.json()
  } catch (e) {
    return new Response('invalid payload', { status: 400 })
  }

  // basic structure: { events: [ { event_type: 'FILE_VERSION_UPDATE', file_key: '...' } ] }
  const events = body.events || []
  const relevant = events.some(ev => ev.event_type === 'FILE_VERSION_UPDATE' || ev.event_type === 'FILE_PUBLISHED')

  // optional: check for a deploy tag in metadata or require a manual flag
  if (!relevant) return new Response('ignored', { status: 200 })

  // TODO: implement debounce (e.g., write to KV and reject if within X minutes)
  // TODO: implement signature verification using X-FIGMA-SIGNATURE header

  // Example: trigger GitHub repository_dispatch (requires GH_TOKEN stored as secret in Worker binding)
  // const GH_TOKEN = GITHUB_TOKEN binding
  // await fetch('https://api.github.com/repos/OWNER/REPO/dispatches', { method: 'POST', headers: { Authorization: `token ${GH_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'figma-sync' }) })

  return new Response('accepted', { status: 202 })
}
