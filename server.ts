import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import {
  mapboxTokenResponse,
  handlePlaces,
  handlePlaceDetails,
  handleGeocode,
  handlePlacePhoto,
} from './lib/api-backend.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.get('/api/mapbox-token', (req, res) => {
    res.json(mapboxTokenResponse());
  });

  app.get('/api/places', async (req, res) => {
    const out = await handlePlaces(req.query as Record<string, string | string[] | undefined>);
    res.status(out.status).json(out.json);
  });

  app.get('/api/place-details', async (req, res) => {
    const out = await handlePlaceDetails(req.query as Record<string, string | string[] | undefined>);
    res.status(out.status).json(out.json);
  });

  app.get('/api/geocode', async (req, res) => {
    const out = await handleGeocode(req.query as Record<string, string | string[] | undefined>);
    res.status(out.status).json(out.json);
  });

  app.get('/api/place-photo', async (req, res) => {
    const out = await handlePlacePhoto(req.query as Record<string, string | string[] | undefined>);
    if ('image' in out) {
      res.set('Content-Type', 'image/jpeg');
      res.status(out.status).send(out.image);
    } else {
      res.status(out.status).json(out.json);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n  Radar de Cria — servidor com /api/*\n  Abra: ${url}\n`);
  });
}

startServer();
