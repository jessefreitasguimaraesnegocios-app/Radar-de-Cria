import axios from 'axios';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Query = Record<string, string | string[] | undefined>;

function first(q: Query, key: string): string | undefined {
  const v = q[key];
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

let supabaseSingleton: SupabaseClient | null | undefined;

function getSupabase(): SupabaseClient | null {
  if (supabaseSingleton !== undefined) return supabaseSingleton;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    supabaseSingleton = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase initialized for places cache');
  } else {
    supabaseSingleton = null;
    console.warn('Supabase URL or key missing — Google Places cache disabled');
  }
  return supabaseSingleton;
}

export function mapboxTokenResponse(): { token: string } {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token || token === 'MY_MAPBOX_TOKEN' || token === 'MAPBOX_ACCESS_TOKEN') {
    return { token: 'pk.eyJ1IjoiZGVtbyIsImEiOiJja2p6eG56eGwwMDIyMnVvN2V6eG56eGwwIn0.demo' };
  }
  return { token };
}

const mockPlaces = (lat: string, lng: string, keyword?: string) => {
  const la = Number(lat);
  const ln = Number(lng);
  return [
    {
      place_id: 'mock_1',
      name: keyword ? `${keyword} Local` : 'Barbearia do Zé',
      vicinity: 'Rua das Flores, 123 - Centro',
      rating: 4.8,
      user_ratings_total: 150,
      geometry: { location: { lat: la + 0.001, lng: ln + 0.001 } },
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
      geometry: { location: { lat: la - 0.002, lng: ln + 0.002 } },
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
      geometry: { location: { lat: la + 0.003, lng: ln - 0.001 } },
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
      geometry: { location: { lat: la - 0.001, lng: ln - 0.003 } },
      opening_hours: { open_now: true },
      hasApp: true,
      hasSite: true,
    },
  ];
};

/** Google Nearby Search: até ~20 por página; no máximo ~60 resultados com paginação. */
const NEARBY_MAX_PAGES = 3;
const PAGE_TOKEN_DELAY_MS = 2200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type NearbyPlace = { place_id?: string };

async function fetchNearbySearchPaginated(
  lat: string,
  lng: string,
  radius: string,
  type: string,
  keyword: string | undefined,
  apiKey: string
): Promise<NearbyPlace[]> {
  const base = new URLSearchParams({
    location: `${lat},${lng}`,
    radius,
    type,
    key: apiKey,
  });
  if (keyword) {
    base.set('keyword', keyword);
  }

  const merged: NearbyPlace[] = [];
  const seen = new Set<string>();
  let nextPageToken: string | undefined;

  for (let page = 0; page < NEARBY_MAX_PAGES; page++) {
    if (page > 0) {
      await sleep(PAGE_TOKEN_DELAY_MS);
    }

    const url =
      page === 0
        ? `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${base.toString()}`
        : `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${encodeURIComponent(nextPageToken!)}&key=${encodeURIComponent(apiKey)}`;

    let data: {
      status: string;
      results?: NearbyPlace[];
      next_page_token?: string;
      error_message?: string;
    };

    const { data: first } = await axios.get(url);
    data = first;

    if (data.status === 'INVALID_REQUEST' && page > 0) {
      await sleep(2500);
      const { data: retry } = await axios.get(url);
      data = retry;
    }

    if (page === 0 && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(data.error_message || `Places status: ${data.status}`);
    }

    if (page > 0 && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      break;
    }

    const batch = data.results ?? [];
    for (const row of batch) {
      const id = row.place_id;
      if (id && !seen.has(id)) {
        seen.add(id);
        merged.push(row);
      }
    }

    nextPageToken = data.next_page_token;
    if (!nextPageToken) {
      break;
    }
  }

  return merged;
}

function buildWhatsAppUrl(phone?: string): string | undefined {
  if (!phone) return undefined;
  const d = phone.replace(/\D/g, '');
  if (d.length < 10) return undefined;
  if (d.startsWith('55') && d.length >= 12) return `https://wa.me/${d}`;
  if (d.length >= 10 && d.length <= 11) return `https://wa.me/55${d}`;
  return `https://wa.me/${d}`;
}

function extractSocialFromHtml(html: string, website: string): { instagram?: string; whatsapp?: string } {
  const out: { instagram?: string; whatsapp?: string } = {};
  const ig = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?/i);
  if (ig) {
    out.instagram = `https://instagram.com/${ig[1]}`;
  }
  const wa =
    html.match(/https?:\/\/wa\.me\/[\d]+/i) ||
    html.match(/https?:\/\/api\.whatsapp\.com\/send[^\s"'<>]*/i) ||
    html.match(/https?:\/\/(?:www\.)?whatsapp\.com\/channel\/[^\s"'<>]+/i);
  if (wa) {
    out.whatsapp = wa[0].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  }
  try {
    const u = new URL(website);
    if (u.hostname.replace(/^www\./, '').includes('instagram.com')) {
      out.instagram = `${u.origin}${u.pathname}`.replace(/\/$/, '') || website;
    }
  } catch {
    /* ignore */
  }
  return out;
}

export async function handlePlaces(query: Query): Promise<{ status: number; json: unknown }> {
  const lat = first(query, 'lat');
  const lng = first(query, 'lng');
  const radius = first(query, 'radius');
  const type = first(query, 'type');
  const keyword = first(query, 'keyword');
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!lat || !lng || !radius || !type) {
    return { status: 400, json: { error: 'Missing lat, lng, radius, or type' } };
  }

  if (!apiKey || apiKey === 'MY_GOOGLE_PLACES_KEY' || apiKey === 'GOOGLE_PLACES_API_KEY') {
    return { status: 200, json: mockPlaces(lat, lng, keyword) };
  }

  try {
    const cacheKey = `${lat}_${lng}_${radius}_${type}_${keyword || ''}`;
    let cachedResults: unknown = null;
    const supabase = getSupabase();

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('places_cache')
          .select('results, timestamp')
          .eq('id', cacheKey)
          .maybeSingle();

        if (error) {
          console.warn('Supabase cache read error:', error.message);
        } else if (data?.timestamp != null && data.results != null) {
          const now = Date.now();
          if (now - Number(data.timestamp) < 3600000) {
            cachedResults = data.results;
          }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('Places cache read error:', msg);
    }

    if (cachedResults) {
      return { status: 200, json: cachedResults };
    }

    let results: NearbyPlace[] = await fetchNearbySearchPaginated(
      lat,
      lng,
      radius,
      type,
      keyword,
      apiKey
    );

    if (results.length === 0 && process.env.GEOAPIFY_API_KEY) {
      try {
        const geoUrl = `https://api.geoapify.com/v2/places?categories=catering,accommodation,activity,commercial,healthcare,leisure,natural,office,production,service,tourism,religion&filter=circle:${lng},${lat},${radius}&bias=proximity:${lng},${lat}&limit=20${keyword ? `&name=${encodeURIComponent(keyword)}` : ''}&apiKey=${process.env.GEOAPIFY_API_KEY}`;
        const geoResponse = await axios.get(geoUrl);
        results = geoResponse.data.features.map((f: { properties: Record<string, unknown> }) => ({
          place_id: f.properties.place_id,
          name: f.properties.name || f.properties.formatted,
          vicinity: f.properties.formatted,
          geometry: {
            location: {
              lat: f.properties.lat,
              lng: f.properties.lon,
            },
          },
          rating: 0,
        }));
      } catch (e) {
        console.error('Geoapify fallback failed:', e);
      }
    }

    try {
      if (supabase) {
        const { error } = await supabase.from('places_cache').upsert(
          { id: cacheKey, results, timestamp: Date.now() },
          { onConflict: 'id' }
        );
        if (error) {
          console.warn('Failed to save places cache:', error.message);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('Failed to save places cache:', msg);
    }

    return { status: 200, json: results };
  } catch (error) {
    console.error('Error fetching places:', error);
    return { status: 500, json: { error: 'Failed to fetch places' } };
  }
}

export async function handlePlaceDetails(query: Query): Promise<{ status: number; json: unknown }> {
  const placeId = first(query, 'placeId');
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return { status: 500, json: { error: 'Google Places API key is missing' } };
  }
  if (!placeId) {
    return { status: 400, json: { error: 'Missing placeId' } };
  }

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,vicinity,rating,website,formatted_phone_number,international_phone_number,opening_hours,photos,geometry&key=${apiKey}`
    );

    const details = response.data.result;

    let hasApp = false;
    let instagramUrl: string | undefined;
    let whatsappFromHtml: string | undefined;
    if (details.website) {
      try {
        const siteResponse = await axios.get(details.website, {
          timeout: 10000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        });
        const siteContent =
          typeof siteResponse.data === 'string' ? siteResponse.data : String(siteResponse.data);
        hasApp = /play\.google\.com\/store\/apps\/details|apps\.apple\.com\/.*\/app\//i.test(siteContent);
        const social = extractSocialFromHtml(siteContent, details.website);
        instagramUrl = social.instagram;
        whatsappFromHtml = social.whatsapp;
      } catch (e) {
        console.warn(
          `Could not fetch website for ${details.name}:`,
          e instanceof Error ? e.message : 'Timeout/Error'
        );
      }
    }

    const phoneForWa =
      details.international_phone_number || details.formatted_phone_number;
    const whatsappFromPhone = buildWhatsAppUrl(phoneForWa);

    details.hasApp = hasApp;
    details.hasSite = !!details.website;
    details.instagram_url = instagramUrl;
    details.whatsapp_url = whatsappFromHtml || whatsappFromPhone;

    return { status: 200, json: details };
  } catch (error) {
    console.error('Error fetching place details:', error);
    return { status: 500, json: { error: 'Failed to fetch place details' } };
  }
}

export async function handleGeocode(query: Query): Promise<{ status: number; json: unknown }> {
  const q = first(query, 'query');
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

  if (!q) {
    return { status: 400, json: { error: 'Missing query' } };
  }

  if (!mapboxToken || mapboxToken === 'MY_MAPBOX_TOKEN') {
    return { status: 200, json: { lat: -19.9191, lng: -43.9386 } };
  }

  try {
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxToken}`
    );

    const [lng, lat] = response.data.features[0].center;
    return { status: 200, json: { lat, lng } };
  } catch (error) {
    console.error('Error geocoding:', error);
    return { status: 500, json: { error: 'Failed to geocode' } };
  }
}

export type PlacePhotoResult =
  | { status: number; image: Buffer }
  | { status: number; json: { error: string } };

export async function handlePlacePhoto(query: Query): Promise<PlacePhotoResult> {
  const photoReference = first(query, 'photoReference');
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return { status: 500, json: { error: 'Google Places API key is missing' } };
  }
  if (!photoReference) {
    return { status: 400, json: { error: 'Missing photoReference' } };
  }

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`,
      { responseType: 'arraybuffer' }
    );

    return { status: 200, image: Buffer.from(response.data) };
  } catch (error) {
    console.error('Error fetching place photo:', error);
    return { status: 500, json: { error: 'Failed to fetch place photo' } };
  }
}
