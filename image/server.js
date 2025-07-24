const express = require('express');
const { Pool } = require('pg');
const path = require('path');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();
// Middleware to parse POST request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

/**
 * Initializes the database by creating a 'services' table if it doesn't exist.
 * This table will store hostnames and IP addresses for sale.
 */
const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    // Drop the old 'visits' table if it exists, to avoid confusion
    await client.query('DROP TABLE IF EXISTS visits;');
    // Create the 'services' table for the HostNetix app
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

// Main route to display the service management dashboard
app.get('/', async (req, res) => {
  let dbStatusMessage = '';
  let dbStatusColor = '#dc3545'; // Red for failure
  let services = [];

  try {
    const client = await pool.connect();
    // Check connection
    await client.query('SELECT NOW()');
    dbStatusMessage = `Connection to PostgreSQL database is stable.`;
    dbStatusColor = '#28a745'; // Green for success

    // Fetch all services
    const servicesResult = await client.query('SELECT id, hostname, ip_address, status, TO_CHAR(created_at, \'YYYY-MM-DD HH24:MI\') as time FROM services ORDER BY id DESC');
    services = servicesResult.rows;
    client.release();
  } catch (err) {
    console.error('Error on main route:', err.stack);
    dbStatusMessage = `Failed to connect to PostgreSQL. Error: ${err.message}`;
  }

  const panamaTime = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Panama', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Generate HTML for the services table
  const servicesHtml = services.map(service => `
    <tr style="background-color: ${service.status === 'Sold' ? '#343a40' : '#2c3034'};">
      <td style="padding: 12px; border-bottom: 1px solid #444;">${service.hostname}</td>
      <td style="padding: 12px; border-bottom: 1px solid #444;">${service.ip_address}</td>
      <td style="padding: 12px; border-bottom: 1px solid #444; color: ${service.status === 'Sold' ? '#ffc107' : '#28a745'};">${service.status}</td>
      <td style="padding: 12px; border-bottom: 1px solid #444;">${service.time}</td>
      <td style="padding: 12px; border-bottom: 1px solid #444; display: flex; gap: 10px; align-items: center;">
        ${service.status === 'Available' ? `
        <form action="/sell/${service.id}" method="POST" style="margin:0;">
          <button type="submit" class="btn sell">Sell</button>
        </form>` : ''}
        <form action="/delete/${service.id}" method="POST" style="margin:0;">
          <button type="submit" class="btn delete">Delete</button>
        </form>
      </td>
    </tr>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HostNetix - Service Management</title>
        <style>
            body { background-color: #212529; color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 2em; }
            .container { max-width: 1200px; margin: auto; }
            h1, h2 { color: #00b8d4; border-bottom: 2px solid #00b8d4; padding-bottom: 10px; }
            .status-bar { margin-top: 1em; padding: 1em; border-radius: 8px; color: #fff; word-wrap: break-word; }
            .form-container, .table-container { background-color: #2c3034; padding: 2em; border-radius: 8px; margin-top: 2em; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
            input[type="text"] { width: calc(50% - 22px); padding: 10px; border-radius: 5px; border: 1px solid #444; background-color: #343a40; color: white; font-size: 16px; }
            .btn { padding: 10px 20px; font-size: 16px; cursor: pointer; color: white; border: none; border-radius: 5px; transition: background-color 0.3s; }
            .btn.add { background-color: #007bff; }
            .btn.add:hover { background-color: #0056b3; }
            .btn.sell { background-color: #28a745; }
            .btn.delete { background-color: #dc3545; }
            table { width: 100%; border-collapse: collapse; margin-top: 1em; }
            th, td { text-align: left; }
            th { padding: 12px; background-color: #343a40; border-bottom: 2px solid #00b8d4; }
        </style>
    </head>
    <body>
      <div class="container">
        <h1>HostNetix Service Dashboard</h1>
        <p>Location: Panama City, Panama | Current Time: ${panamaTime}</p>
        
        <div class="status-bar" style="background-color: ${dbStatusColor};">
          <strong>Database Status:</strong> ${dbStatusMessage}
        </div>

        <div class="form-container">
          <h2>Add New Service</h2>
          <form action="/add" method="POST" style="display: flex; gap: 10px;">
            <input type="text" name="hostname" placeholder="Enter Hostname (e.g., server1.hostnetix.com)" required>
            <input type="text" name="ip_address" placeholder="Enter Public IP (e.g., 192.0.2.1)" required>
            <button type="submit" class="btn add">Add Service</button>
          </form>
        </div>

        <div class="table-container">
          <h2>Service Inventory</h2>
          <table>
            <thead>
              <tr>
                <th>Hostname</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${servicesHtml || '<tr><td colspan="5" style="padding: 12px; text-align: center;">No services in inventory.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `);
});

// POST route to add a new service
app.post('/add', async (req, res) => {
  const { hostname, ip_address } = req.body;
  if (!hostname || !ip_address) {
    return res.status(400).send('Hostname and IP Address are required.');
  }
  try {
    await pool.query('INSERT INTO services (hostname, ip_address) VALUES ($1, $2)', [hostname, ip_address]);
    console.log(`Added new service: ${hostname}`);
    res.redirect('/');
  } catch (err) {
    console.error('Error inserting service:', err.stack);
    res.status(500).send('Failed to add service.');
  }
});

// POST route to DELETE a service
app.post('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM services WHERE id = $1', [id]);
        console.log(`Deleted service with ID: ${id}`);
        res.redirect('/');
    } catch (err) {
        console.error('Error deleting service:', err.stack);
        res.status(500).send('Failed to delete service.');
    }
});

// POST route to UPDATE a service's status to "Sold"
app.post('/sell/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE services SET status = $1 WHERE id = $2', ['Sold', id]);
        console.log(`Sold service with ID: ${id}`);
        res.redirect('/');
    } catch (err) {
        console.error('Error updating service status:', err.stack);
        res.status(500).send('Failed to update service.');
    }
});


app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  initializeDatabase();
});

