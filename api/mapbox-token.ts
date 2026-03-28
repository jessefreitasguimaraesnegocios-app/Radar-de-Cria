import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapboxTokenResponse } from '../lib/api-backend.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }
  return res.status(200).json(mapboxTokenResponse());
}
