require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cambia-este-secreto';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(express.json({ limit: '15mb' })); // suficiente para imágenes en base64
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- Conexión a la base de datos ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')
    ? { rejectUnauthorized: false }
    : (process.env.DATABASE_URL ? { rejectUnauthorized: false } : false),
});

const DEFAULTS = {
  heroTitle: '909',
  heroSubtitle: 'Un lugar para hablar, jugar y pasar el rato cuando afuera está helando.',
  inviteLink: 'https://discord.gg/TU-CODIGO-AQUI',
  backgroundImage: '',
  snowEnabled: true,
};

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      hero_title TEXT NOT NULL DEFAULT '909',
      hero_subtitle TEXT NOT NULL DEFAULT '',
      invite_link TEXT NOT NULL DEFAULT '',
      background_image TEXT NOT NULL DEFAULT '',
      snow_enabled BOOLEAN NOT NULL DEFAULT true
    );
  `);
  const { rows } = await pool.query('SELECT id FROM settings WHERE id = 1');
  if (rows.length === 0) {
    await pool.query(
      `INSERT INTO settings (id, hero_title, hero_subtitle, invite_link, background_image, snow_enabled)
       VALUES (1, $1, $2, $3, $4, $5)`,
      [DEFAULTS.heroTitle, DEFAULTS.heroSubtitle, DEFAULTS.inviteLink, DEFAULTS.backgroundImage, DEFAULTS.snowEnabled]
    );
  }
}

function rowToSettings(row) {
  return {
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    inviteLink: row.invite_link,
    backgroundImage: row.background_image,
    snowEnabled: row.snow_enabled,
  };
}

// --- API pública: configuración actual del sitio ---
app.get('/api/settings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM settings WHERE id = 1');
    res.json(rows[0] ? rowToSettings(rows[0]) : DEFAULTS);
  } catch (err) {
    console.error('Error leyendo settings:', err.message);
    res.json(DEFAULTS);
  }
});

// --- Login admin ---
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60 * 1000,
    });
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: 'Contraseña incorrecta' });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

function requireAdmin(req, res, next) {
  const token = req.cookies.admin_token;
  if (!token) return res.status(401).json({ ok: false, error: 'No autenticado' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Sesión inválida o expirada' });
  }
}

app.get('/api/admin/check', requireAdmin, (req, res) => res.json({ ok: true }));

// --- Guardar configuración (protegido) ---
app.post('/api/admin/settings', requireAdmin, async (req, res) => {
  const { heroTitle, heroSubtitle, inviteLink, backgroundImage, snowEnabled } = req.body || {};

  // backgroundImage puede venir como data:URL en base64 o como '' para quitarla
  if (backgroundImage && !backgroundImage.startsWith('data:image/') && !backgroundImage.startsWith('http')) {
    return res.status(400).json({ ok: false, error: 'Formato de imagen no válido' });
  }

  try {
    await pool.query(
      `UPDATE settings SET
        hero_title = COALESCE($1, hero_title),
        hero_subtitle = COALESCE($2, hero_subtitle),
        invite_link = COALESCE($3, invite_link),
        background_image = COALESCE($4, background_image),
        snow_enabled = COALESCE($5, snow_enabled)
       WHERE id = 1`,
      [
        heroTitle ?? null,
        heroSubtitle ?? null,
        inviteLink ?? null,
        backgroundImage === undefined ? null : backgroundImage,
        snowEnabled === undefined ? null : snowEnabled,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error guardando settings:', err.message);
    res.status(500).json({ ok: false, error: 'Error al guardar en la base de datos' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, async () => {
  try {
    await initDb();
    console.log('Base de datos lista.');
  } catch (err) {
    console.error('No se pudo inicializar la base de datos:', err.message);
  }
  console.log(`Servidor 909 corriendo en el puerto ${PORT}`);
});
