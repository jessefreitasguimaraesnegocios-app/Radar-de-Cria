import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePlacePhoto } from '../lib/api-backend.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }
  const out = await handlePlacePhoto(req.query as Record<string, string | string[] | undefined>);
  if ('image' in out) {
    res.setHeader('Content-Type', 'image/jpeg');
    return res.status(out.status).send(out.image);
  }
  return res.status(out.status).json(out.json);
}
