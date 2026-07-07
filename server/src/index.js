require('dotenv').config();
const express = require('express');
const cors = require('cors');
const wcagRouter = require('./routes/wcag');

const app = express();
const PORT = process.env.PORT || 8090;

app.use(cors({ origin: ['http://localhost:9000','http://localhost:8081','http://localhost:8082','http://localhost:8083'] }));
app.use(express.json({ limit: '256kb' }));

app.use('/api/wcag', wcagRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () =>
  console.log(`[agent-server] listening on http://localhost:${PORT}`)
);
