import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import cors from 'cors';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let db: any;

try {
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
    if (!getApps().length) {
      initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    // Use the specific database ID from config
    const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
    if (databaseId === '(default)') {
      db = getFirestore();
    } else {
      db = getFirestore(databaseId);
    }
    console.log(`Firestore initialized for project ${firebaseConfig.projectId} with database: ${databaseId}`);
  } else {
    db = getFirestore();
    console.log('Firestore initialized with default database');
  }
} catch (error) {
  console.error('Failed to initialize Firestore:', error);
  // Fallback to a dummy db object to prevent crashes
  db = {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false }),
        set: async () => {},
      }),
    }),
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/mapbox-token', (req, res) => {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (!token || token === 'MY_MAPBOX_TOKEN' || token === 'MAPBOX_ACCESS_TOKEN') {
      // Return a dummy token for demo purposes (won't work for real tiles, but prevents 401 on fetch)
      return res.json({ token: 'pk.eyJ1IjoiZGVtbyIsImEiOiJja2p6eG56eGwwMDIyMnVvN2V6eG56eGwwIn0.demo' });
    }
    res.json({ token });
  });

  app.get('/api/places', async (req, res) => {
    const { lat, lng, radius, type, keyword } = req.query;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    console.log(`API Key Check: ${apiKey ? apiKey.substring(0, 5) + '...' : 'MISSING'}`);

    if (!apiKey || apiKey === 'MY_GOOGLE_PLACES_KEY' || apiKey === 'GOOGLE_PLACES_API_KEY') {
      // Return mock data for demo purposes
      console.log('Using mock data for places (API key missing or placeholder)');
      const mockPlaces = [
        {
          place_id: 'mock_1',
          name: keyword ? `${keyword} Local` : 'Barbearia do Zé',
          vicinity: 'Rua das Flores, 123 - Centro',
          rating: 4.8,
          user_ratings_total: 150,
          geometry: { location: { lat: Number(lat) + 0.001, lng: Number(lng) + 0.001 } },
          opening_hours: { open_now: true },
          hasApp: true,
          hasSite: true,
        },
        {
          place_id: 'mock_2',
          name: keyword ? `Melhor ${keyword}` : 'Restaurante Sabor Real',
          vicinity: 'Av. Paulista, 1000 - Bela Vista',
          rating: 4.5,
          user_ratings_total: 320,
          geometry: { location: { lat: Number(lat) - 0.002, lng: Number(lng) + 0.002 } },
          opening_hours: { open_now: true },
          hasApp: false,
          hasSite: true,
        },
        {
          place_id: 'mock_3',
          name: keyword ? `${keyword} Express` : 'Pub Night Life',
          vicinity: 'Rua Augusta, 500 - Consolação',
          rating: 4.2,
          user_ratings_total: 85,
          geometry: { location: { lat: Number(lat) + 0.003, lng: Number(lng) - 0.001 } },
          opening_hours: { open_now: false },
          hasApp: false,
          hasSite: false,
        },
        {
          place_id: 'mock_4',
          name: keyword ? `Tech ${keyword}` : 'Café Tech',
          vicinity: 'Rua dos Devs, 404 - Inovação',
          rating: 4.9,
          user_ratings_total: 210,
          geometry: { location: { lat: Number(lat) - 0.001, lng: Number(lng) - 0.003 } },
          opening_hours: { open_now: true },
          hasApp: true,
          hasSite: true,
        }
      ];
      return res.json(mockPlaces);
    }

    try {
      // Check cache first (with error handling)
      let cachedResults = null;
      const cacheKey = `${lat}_${lng}_${radius}_${type}_${keyword || ''}`;
      const cacheRef = db.collection('places_cache');

      try {
        const cachedDoc = await cacheRef.doc(cacheKey).get();

        if (cachedDoc.exists) {
          const data = cachedDoc.data();
          const now = Date.now();
          // Cache for 1 hour
          if (now - data?.timestamp < 3600000) {
            cachedResults = data?.results;
          }
        }
      } catch (cacheError: any) {
        if (cacheError.code === 7 || cacheError.message?.includes('PERMISSION_DENIED')) {
          console.warn('Firestore cache PERMISSION_DENIED. Check if the database is initialized and the service account has permissions.');
        } else {
          console.warn('Firestore cache error (falling back to direct API):', cacheError.message || cacheError);
        }
      }

      if (cachedResults) {
        return res.json(cachedResults);
      }

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}${keyword ? `&keyword=${encodeURIComponent(keyword as string)}` : ''}&key=${apiKey}`
      );

      let results = response.data.results;

      // Fallback to Geoapify if Google returns no results
      if (results.length === 0 && process.env.GEOAPIFY_API_KEY) {
        try {
          const geoUrl = `https://api.geoapify.com/v2/places?categories=catering,accommodation,activity,commercial,healthcare,leisure,natural,office,production,service,tourism,religion&filter=circle:${lng},${lat},${radius}&bias=proximity:${lng},${lat}&limit=20${keyword ? `&name=${encodeURIComponent(keyword as string)}` : ''}&apiKey=${process.env.GEOAPIFY_API_KEY}`;
          const geoResponse = await axios.get(geoUrl);
          results = geoResponse.data.features.map((f: any) => ({
            place_id: f.properties.place_id,
            name: f.properties.name || f.properties.formatted,
            vicinity: f.properties.formatted,
            geometry: {
              location: {
                lat: f.properties.lat,
                lng: f.properties.lon,
              },
            },
            rating: 0, // Geoapify doesn't provide ratings in the same way
          }));
        } catch (e) {
          console.error('Geoapify fallback failed:', e);
        }
      }

      // Cache the results
      try {
        await cacheRef.doc(cacheKey).set({
          results,
          timestamp: Date.now(),
        });
      } catch (cacheError: any) {
        if (cacheError.code === 7 || cacheError.message?.includes('PERMISSION_DENIED')) {
          // Silent failure for permission denied on save to avoid log spam
        } else {
          console.warn('Failed to save to Firestore cache:', cacheError.message || cacheError);
        }
      }

      res.json(results);
    } catch (error) {
      console.error('Error fetching places:', error);
      res.status(500).json({ error: 'Failed to fetch places' });
    }
  });

  app.get('/api/place-details', async (req, res) => {
    const { placeId } = req.query;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Google Places API key is missing' });
    }

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,website,formatted_phone_number,opening_hours,photos,geometry&key=${apiKey}`
      );

      const details = response.data.result;

      // Intelligent Verification: Check for app links if website exists
      let hasApp = false;
      if (details.website) {
        try {
          const siteResponse = await axios.get(details.website, { 
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          const siteContent = siteResponse.data;
          hasApp = /play\.google\.com\/store\/apps\/details|apps\.apple\.com\/.*\/app\//i.test(siteContent);
        } catch (e) {
          console.warn(`Could not fetch website for ${details.name}:`, e instanceof Error ? e.message : 'Timeout/Error');
        }
      }

      details.hasApp = hasApp;
      details.hasSite = !!details.website;

      res.json(details);
    } catch (error) {
      console.error('Error fetching place details:', error);
      res.status(500).json({ error: 'Failed to fetch place details' });
    }
  });

  app.get('/api/geocode', async (req, res) => {
    const { query } = req.query;
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

    if (!mapboxToken || mapboxToken === 'MY_MAPBOX_TOKEN') {
      // Mock geocoding for demo
      console.log('Using mock geocoding (API key missing)');
      return res.json({ lat: -19.9191, lng: -43.9386 }); // Default to Belo Horizonte
    }

    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query as string)}.json?access_token=${mapboxToken}`
      );

      const [lng, lat] = response.data.features[0].center;
      res.json({ lat, lng });
    } catch (error) {
      console.error('Error geocoding:', error);
      res.status(500).json({ error: 'Failed to geocode' });
    }
  });

  app.get('/api/place-photo', async (req, res) => {
    const { photoReference } = req.query;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Google Places API key is missing' });
    }

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`,
        { responseType: 'arraybuffer' }
      );

      res.set('Content-Type', 'image/jpeg');
      res.send(response.data);
    } catch (error) {
      console.error('Error fetching place photo:', error);
      res.status(500).json({ error: 'Failed to fetch place photo' });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
