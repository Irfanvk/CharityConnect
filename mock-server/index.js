import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;

// In-memory store seeded with minimal sample data
const store = {
  Member: [
    { id: 'm1', member_id: 'MEM-0001', full_name: 'Alice Admin', email: 'admin@example.com', role: 'admin' }
  ],
  Invite: [
    { id: 'i1', invite_code: 'INV-ABC123', status: 'pending', email: 'newuser@example.com', expires_at: new Date(Date.now()+86400000).toISOString() }
  ],
  Notification: [],
  Campaign: [],
  Challan: [],
  AuditLog: [],
  RecurringDonation: [],
  Request: [],
  User: [ { id: 'u1', email: 'admin@example.com', full_name: 'Alice Admin' } ]
};

// Simple token handling
const VALID_TOKEN = 'mock-token-123';

app.post('/auth/login', (req, res) => {
  const { email } = req.body || {};
  // Accept any email for the mock; return token and basic user
  const user = store.User.find(u => u.email === email) || store.User[0];
  res.json({ token: VALID_TOKEN, user });
});

app.get('/auth/me', (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
  const token = auth.split(' ')[1];
  if (token !== VALID_TOKEN) return res.status(401).json({ message: 'Invalid token' });
  return res.json(store.User[0]);
});

// Public app settings
app.get('/api/apps/public/prod/public-settings/by-id/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id, public_settings: { auth_required: false } });
});

// Generic entity endpoints: list, create, get, update, delete
app.get('/entities/:entity', (req, res) => {
  const { entity } = req.params;
  const list = store[entity] || [];
  res.json(list);
});

app.get('/entities/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  const item = (store[entity] || []).find(x => x.id === id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

app.post('/entities/:entity', (req, res) => {
  const { entity } = req.params;
  const data = req.body || {};
  const id = uuidv4();
  const record = { id, ...data };
  store[entity] = store[entity] || [];
  store[entity].unshift(record);
  res.status(201).json(record);
});

app.put('/entities/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  const data = req.body || {};
  store[entity] = store[entity] || [];
  const idx = store[entity].findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  store[entity][idx] = { ...store[entity][idx], ...data };
  res.json(store[entity][idx]);
});

app.delete('/entities/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  store[entity] = store[entity] || [];
  const idx = store[entity].findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  const removed = store[entity].splice(idx, 1)[0];
  res.json(removed);
});

app.listen(PORT, () => {
  console.log(`Mock server listening on http://localhost:${PORT}`);
});
