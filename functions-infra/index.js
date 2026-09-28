'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

const auth = getAuth();
const db = getFirestore();

const PARTS = Object.freeze({
  network: 'network.json',
  cruces: 'cruces.json',
  interferencias: 'interferencias.json'
});

const cache = new Map();

function loadPart(part) {
  if (!PARTS[part]) return null;
  if (!cache.has(part)) {
    const filename = path.join(__dirname, 'data', PARTS[part]);
    cache.set(part, JSON.parse(fs.readFileSync(filename, 'utf8')));
  }
  return cache.get(part);
}

async function authorize(req) {
  const header = String(req.get('authorization') || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const decoded = await auth.verifyIdToken(match[1]);
  const snap = await db.collection('infraestructuraUsuarios').doc(decoded.uid).get();
  if (!snap.exists) return null;

  const profile = snap.data() || {};
  const tokenEmail = String(decoded.email || '').trim().toLowerCase();
  const listedEmail = String(profile.email || '').trim().toLowerCase();

  if (profile.activo !== true) return null;
  if (profile.rol && profile.rol !== 'infraestructura') return null;
  if (listedEmail && listedEmail !== tokenEmail) return null;

  return { uid: decoded.uid, email: decoded.email || '', profile };
}

exports.infraestructuraData = onRequest(
  {
    region: 'southamerica-east1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 10
  },
  async (req, res) => {
    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('X-Content-Type-Options', 'nosniff');

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'method-not-allowed' });
      return;
    }

    let user;
    try {
      user = await authorize(req);
    } catch (error) {
      console.error('infraestructura auth error', error);
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }

    if (!user) {
      res.status(403).json({ error: 'not-authorized' });
      return;
    }

    const part = String(req.query.part || '');

    if (part === 'profile') {
      res.json({
        uid: user.uid,
        email: user.email,
        nombre: user.profile.nombre || '',
        rol: 'infraestructura'
      });
      return;
    }

    const payload = loadPart(part);
    if (payload === null) {
      res.status(400).json({ error: 'invalid-part' });
      return;
    }

    res.json(payload);
  }
);
