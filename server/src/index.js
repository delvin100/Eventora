import app from './app.js';
import { startKeepAlive } from './utils/keepAlive.js';

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Eventora API Server running on http://localhost:${PORT}`);
    startKeepAlive();
  });
}
