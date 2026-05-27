const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const CODES_FILE = './codes.json';

function loadCodes() {
  try {
    if (fs.existsSync(CODES_FILE)) {
      return JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
    }
  } catch(e) {}
  return {};
}

function saveCodes(codes) {
  fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
}

let codes = loadCodes();

// Generar código (solo para ti, con contraseña)
app.post('/api/generate-code', (req, res) => {
  const { email, secret } = req.body;
  
  // Contraseña simple para que nadie más genere códigos
  if (secret !== 'TU_CONTRASEÑA_SECRETA') {
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  const code = crypto.randomBytes(6).toString('hex').toUpperCase();
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  
  codes[code] = {
    email: email,
    activated: false,
    expirationDate: expirationDate.toISOString(),
    createdAt: new Date().toISOString()
  };
  saveCodes(codes);
  
  res.json({ success: true, code: code, expirationDate: expirationDate.toISOString() });
});

// Activar código (desde la app)
app.post('/api/activate', (req, res) => {
  const { code, userId } = req.body;
  
  if (!codes[code]) {
    return res.json({ success: false, error: 'Código inválido' });
  }
  
  if (codes[code].activated) {
    return res.json({ success: false, error: 'Código ya utilizado' });
  }
  
  const expirationDate = new Date(codes[code].expirationDate);
  if (new Date() > expirationDate) {
    return res.json({ success: false, error: 'Código expirado' });
  }
  
  codes[code].activated = true;
  codes[code].activatedBy = userId;
  codes[code].activatedAt = new Date().toISOString();
  saveCodes(codes);
  
  res.json({ success: true, expirationDate: codes[code].expirationDate });
});

// Verificar estado Pro
app.get('/api/check-pro', (req, res) => {
  const { userId } = req.query;
  
  let activeCode = null;
  for (const [code, data] of Object.entries(codes)) {
    if (data.activatedBy === userId && data.activated === true) {
      activeCode = data;
      break;
    }
  }
  
  if (!activeCode) {
    return res.json({ isPro: false });
  }
  
  const expirationDate = new Date(activeCode.expirationDate);
  if (new Date() > expirationDate) {
    return res.json({ isPro: false, expired: true });
  }
  
  const daysLeft = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
  res.json({ isPro: true, daysLeft: daysLeft });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(Servidor corriendo en http://localhost:);
});
