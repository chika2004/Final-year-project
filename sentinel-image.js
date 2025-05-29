
export default async function handler(req, res) {
  const CLIENT_ID = process.env.SENTINEL_CLIENT_ID;
  const CLIENT_SECRET = process.env.SENTINEL_CLIENT_SECRET;
  const INSTANCE_ID = process.env.SENTINEL_INSTANCE_ID;

  if (!CLIENT_ID || !CLIENT_SECRET || !INSTANCE_ID) {
    return res.status(500).json({ error: "Missing Sentinel Hub credentials." });
  }

  try {
    const authRes = await fetch('https://services.sentinel-hub.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    });

    const { access_token } = await authRes.json();

    const lat = 8.1276;
    const lng = 5.1008;
    const bbox = `${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}`;

    const params = new URLSearchParams({
      SERVICE: 'WMS',
      REQUEST: 'GetMap',
      LAYERS: 'TRUE_COLOR',
      MAXCC: '20',
      FORMAT: 'image/jpeg',
      CRS: 'EPSG:4326',
      BBOX: bbox,
      WIDTH: '1024',
      HEIGHT: '1024',
      TIME: '2024-01-01/2025-12-31'
    });

    const imageRes = await fetch(`https://services.sentinel-hub.com/ogc/wms/${INSTANCE_ID}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const buffer = await imageRes.arrayBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch image from Sentinel Hub.' });
  }
}
