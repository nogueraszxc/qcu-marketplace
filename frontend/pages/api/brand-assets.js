import { readFile } from 'node:fs/promises';
import path from 'node:path';
export default async function handler(req, res) {
  const enabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SHOW_UNIVERSITY_ASSETS === 'true' || (process.env.NEXT_PUBLIC_QCU_ASSETS_AUTHORIZED === 'true' && process.env.QCU_AUTHORIZED === 'true');
  if (!enabled || !['campus', 'seal'].includes(req.query.asset) || !['GET', 'HEAD'].includes(req.method)) return res.status(404).end();
  try {
    const bytes = await readFile(path.join(process.cwd(), 'assets', 'brand', `${req.query.asset}.png`));
    res.setHeader('Content-Type', 'image/png'); res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).send(bytes);
  } catch { return res.status(404).end(); }
}
