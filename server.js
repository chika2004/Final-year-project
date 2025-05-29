// server.js - Proxy backend to fetch live Sentinel imagery
require('dotenv').config({ path: '.env.local' });
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3001;

const SENTINEL_CLIENT_ID = process.env.SENTINEL_CLIENT_ID;
const SENTINEL_CLIENT_SECRET = process.env.SENTINEL_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = null;

// Get OAuth2 token from Sentinel Hub
async function getAccessToken() {
  if (cachedToken && tokenExpiry > Date.now()) return cachedToken;

  const response = await axios.post('https://services.sentinel-hub.com/oauth/token', {
    client_id: SENTINEL_CLIENT_ID,
    client_secret: SENTINEL_CLIENT_SECRET,
    grant_type: 'client_credentials'
  });

  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // buffer 60 seconds
  return cachedToken;
}

// Proxy endpoint to fetch imagery
app.get('/api/sentinel-image', async (req, res) => {
  try {
    const token = await getAccessToken();

    const bbox = '5.0925,8.1198,5.0985,8.1238'; // Approximate bounding box for Landmark University

    const sentinelResponse = await axios.get('https://services.sentinel-hub.com/ogc/wms/<INSTANCE_ID>', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        SERVICE: 'WMS',
        REQUEST: 'GetMap',
        BBOX: bbox,
        FORMAT: 'image/jpeg',
        WIDTH: 1024,
        HEIGHT: 1024,
        LAYERS: 'TRUE_COLOR',
        MAXCC: 10,
        TIME: '2024-05-01/2024-05-23',
        SRS: 'EPSG:4326',
        VERSION: '1.3.0'
      },
      responseType: 'arraybuffer'
    });

    res.set('Content-Type', 'image/jpeg');
    res.send(sentinelResponse.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
    res.status(500).json({ error: 'Failed to fetch Sentinel image' });
  }
});

app.listen(port, () => {
  console.log(`Sentinel proxy server running on http://localhost:${port}`);
});
