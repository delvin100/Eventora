/**
 * Render Free Tier Inactivity Prevention (Keep-Alive)
 * Pings the server's health check endpoint every 14 minutes to prevent Render's
 * free instance from spinning down after 15 minutes of inactivity.
 */
export function startKeepAlive() {
  const url = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL;

  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      console.log('ℹ️ Render Keep-Alive: Set RENDER_EXTERNAL_URL or SERVER_URL to enable automatic keep-alive.');
    }
    return;
  }

  // Ensure path is /api/v1/health
  const baseUrl = url.replace(/\/$/, '');
  const targetUrl = baseUrl.endsWith('/api/v1/health') ? baseUrl : `${baseUrl}/api/v1/health`;
  const intervalMs = 14 * 60 * 1000; // 14 minutes (Render sleeps at 15m)

  console.log(`⏱️ Keep-Alive configured to ping: ${targetUrl} every 14 minutes`);

  setInterval(async () => {
    try {
      const res = await fetch(targetUrl);
      if (res.ok) {
        console.log(`[${new Date().toISOString()}] 💓 Keep-Alive ping successful (${res.status})`);
      } else {
        console.warn(`[${new Date().toISOString()}] ⚠️ Keep-Alive ping returned status ${res.status}`);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ❌ Keep-Alive ping failed:`, err.message);
    }
  }, intervalMs);
}

