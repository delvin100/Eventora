import express from 'express';
import cors from 'cors';
import { isSupabaseEnabled } from './config/supabase.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';

// Route Modules
import eventRoutes from './routes/eventRoutes.js';
import participantRoutes from './routes/participantRoutes.js';
import resultRoutes from './routes/resultRoutes.js';

const app = express();

// Global Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Eventora API',
    tagline: 'Spin. Shuffle. Select. Organize.',
    supabaseConnected: isSupabaseEnabled,
    timestamp: new Date().toISOString()
  });
});

// User Profile
app.get('/api/v1/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    display_name: req.user.user_metadata?.display_name || 'Organizer'
  });
});

// Mount Resource Routes
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/events/:eventId/participants', participantRoutes);
app.use('/api/v1/events/:eventId/results', resultRoutes);

// Error Handling
app.use(errorHandler);

export default app;
