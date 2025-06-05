import fetch from 'node-fetch';

const CLIENT_ID = '4c3fbfae-c21f-4824-aa29-44d9f3800c6a';
const CLIENT_SECRET = 'JkN6BBiXYyyCxzrltxt2EsC46Siy5MlE';
const INSTANCE_ID = 'd304141f-a2c1-4933-9b09-99dde720a645'; // Your configuration ID

// Store the token and its expiry for dynamic refresh
let cachedAccessToken = null;
let tokenExpiryTime = 0; // Unix timestamp in milliseconds

async function getAccessToken() {
    // Check if token is still valid (e.g., valid for next 5 minutes)
    if (cachedAccessToken && (Date.now() < tokenExpiryTime - (5 * 60 * 1000))) {
        return cachedAccessToken;
    }

    // Token is expired or not present, fetch a new one
    console.log('Fetching new Sentinel Hub access token...');
    const tokenResponse = await fetch('https://services.sentinel-hub.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'client_credentials',
        }),
    });

    if (!tokenResponse.ok) {
        const text = await tokenResponse.text();
        throw new Error(`Failed to get access token: ${text}`);
    }

    const { access_token, expires_in } = await tokenResponse.json();

    if (!access_token) {
        throw new Error('No access token received from Sentinel Hub');
    }

    // Cache the new token and calculate expiry time
    cachedAccessToken = access_token;
    tokenExpiryTime = Date.now() + (expires_in * 1000); // expires_in is in seconds

    console.log('New Sentinel Hub access token obtained and cached.');
    return cachedAccessToken;
}

export default async function handler(req, res) {
    try {
        const accessToken = await getAccessToken();

        // Step 2: Construct Sentinel Hub WMTS tile URL template
        // This is the correct way to get tiles for Mapbox 'raster' source
        // Using `CRS=EPSG:3857` is common for web maps (Web Mercator)
        // Note: The `LAYERS` should match your configuration in Sentinel Hub.
        // `TRUE-COLOR` is generally correct for a basic RGB visualization.
        // `time=` can be used to specify a date range, or omitted for latest.
        // `{z}/{x}/{y}` are Mapbox's expected tile parameters.
        const wmtsTileUrl = `https://services.sentinel-hub.com/ogc/wmts/${INSTANCE_ID}?request=GetTile&service=WMTS&version=1.0.0&LAYER=TRUE-COLOR&STYLE=DEFAULT&TILEMATRIXSET=WebMercatorQuad&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png&time=2023-01-01/2025-12-31&transparent=true&access_token=${accessToken}`;

        // Step 3: Return the tile URL to the frontend as JSON
        res.status(200).json({ url: wmtsTileUrl });

    } catch (error) {
        console.error('Error in /api/sentinel-image:', error);
        return res.status(500).json({ error: 'Internal server error', detail: error.message });
    }
}