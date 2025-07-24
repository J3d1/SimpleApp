const express = require('express');
const { Pool } = require('pg');

const PORT = 8080;
const HOST = '0.0.0.0';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('DROP TABLE IF EXISTS visits;');
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        hostname VARCHAR(255) NOT NULL,
        ip_address VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Available',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Database table "services" is ready.');
  } catch (err) {
    console.error('Error initializing database table:', err.stack);
  } finally {
    client.release();
  }
};

// GET /api/services - Fetches all services
app.get('/api/services', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, hostname, ip_address, status, TO_CHAR(created_at, \'YYYY-MM-DD HH24:MI\') as time FROM services ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching services:', err.stack);
    res.status(500).json({ error: 'Failed to fetch services.' });
  }
});

// POST /api/services - Adds a new service
app.post('/api/services', async (req, res) => {
  const { hostname, ip_address } = req.body;
  if (!hostname || !ip_address) {
    return res.status(400).json({ error: 'Hostname and IP Address are required.' });
  }
  try {
    const result = await pool.query('INSERT INTO services (hostname, ip_address) VALUES ($1, $2) RETURNING *', [hostname, ip_address]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting service:', err.stack);
    res.status(500).json({ error: 'Failed to add service.' });
  }
});

// DELETE /api/services/:id - Deletes a service
app.delete('/api/services/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM services WHERE id = $1', [id]);
        res.status(204).send(); // 204 No Content for successful deletion
    } catch (err) {
        console.error('Error deleting service:', err.stack);
        res.status(500).json({ error: 'Failed to delete service.' });
    }
});

// POST /api/services/:id/sell - Updates a service's status to "Sold"
app.post('/api/services/:id/sell', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('UPDATE services SET status = $1 WHERE id = $2 RETURNING *', ['Sold', id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating service status:', err.stack);
        res.status(500).json({ error: 'Failed to update service.' });
    }
});

app.listen(PORT, HOST, () => {
  console.log(`Backend API server running on http://${HOST}:${PORT}`);
  initializeDatabase();
});

