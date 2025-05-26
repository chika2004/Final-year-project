
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = 5000;

const CLIENT_ID = '4c3fbfae-c21f-4824-aa29-44d9f3800c6a'; // Replace with your Sentinel Hub client ID
const CLIENT_SECRET = 'JkN6BBiXYyyCxzrltxt2EsC46Siy5MlE'; // Replace with your Sentinel Hub client secret

const LANDMARK_COORDS = {
  lat: 8.1264,
  lng: 5.0892
};

app.get('/sentinel-image', async (req, res) => {
  try {
    const authResponse = await fetch('https://services.sentinel-hub.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });
    const authData = await authResponse.json();
    const token = authData.access_token;

    const response = await fetch(`https://services.sentinel-hub.com/api/v1/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          bounds: {
            bbox: [LANDMARK_COORDS.lng - 0.005, LANDMARK_COORDS.lat - 0.005, LANDMARK_COORDS.lng + 0.005, LANDMARK_COORDS.lat + 0.005]
          },
          data: [{ type: "sentinel-2-l1c" }]
        },
        output: {
          width: 512,
          height: 512,
          responses: [{ identifier: "default", format: { type: "image/png" } }]
        },
        evalscript: `
          //VERSION=3
          function setup() {
            return {
              input: ["B04", "B03", "B02"],
              output: { bands: 3 }
            };
          }
          function evaluatePixel(sample) {
            return [sample.B04, sample.B03, sample.B02];
          }
        `
      })
    });

    const imageBuffer = await response.buffer();
    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get satellite image' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
