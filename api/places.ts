import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePlaces } from '../lib/api-backend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }
  const out = await handlePlaces(req.query as Record<string, string | string[] | undefined>);
  return res.status(out.status).json(out.json);
}
