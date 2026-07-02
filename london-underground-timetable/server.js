const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const https = require('https');
const { URL } = require('url');
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = 3000;

// TfL API Configuration
const TFL_API_BASE = 'https://api.tfl.gov.uk';
const TFL_APP_ID = process.env.TFL_APP_ID || '';
const TFL_APP_KEY = process.env.TFL_APP_KEY || '';
// Using public API without authentication, adding user agent for better compatibility
const TFL_OPTIONS = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
  }
};

// Helper function to make HTTPS requests to TfL API
function makeApiRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${TFL_API_BASE}${path}`);
    if (TFL_APP_ID) url.searchParams.set('app_id', TFL_APP_ID);
    if (TFL_APP_KEY) url.searchParams.set('app_key', TFL_APP_KEY);

    https.get(url, TFL_OPTIONS, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } else {
            console.log(`TfL API returned status ${res.statusCode} for ${url.pathname}${url.search}`);
            reject(new Error(`API returned status ${res.statusCode}`));
          }
        } catch (e) {
          console.log('Response:', data.substring(0, 200));
          reject(new Error('Invalid JSON response from TfL API'));
        }
      });
    }).on('error', (e) => {
      console.error('TfL API request error:', e.message);
      reject(e);
    });
  });
}

// Cache for API data
let cachedLines = null;
let cachedStations = null;
let lastLinesUpdate = 0;
let lastStationsUpdate = 0;
const CACHE_DURATION = 300000; // 5 minutes

const stopPointSearchCache = new Map();
const STOP_SEARCH_CACHE_DURATION = 60000; // 1 minute
const lineRouteCache = new Map();
const ROUTE_CACHE_DURATION = 600000; // 10 minutes

async function loadTubeLines() {
  const now = Date.now();
  if (!cachedLines || (now - lastLinesUpdate) > CACHE_DURATION) {
    console.log('Fetching lines from TfL API...');
    try {
      cachedLines = await makeApiRequest('/Line/Mode/tube');
      lastLinesUpdate = now;
      console.log(`Successfully fetched ${cachedLines.length} lines from TfL`);
    } catch (apiError) {
      console.log('TfL API unavailable, using local data');
      const stations = require('./public/stations.json');
      cachedLines = Object.keys(stations).map(line => ({ name: line, id: line.toLowerCase() }));
      lastLinesUpdate = now;
    }
  }
  return cachedLines;
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/api/stations', async (req, res) => {
  try {
    const stations = require('./public/stations.json');
    res.json(stations);
  } catch (error) {
    console.error('Error loading stations:', error);
    res.status(500).json({ error: 'Failed to load stations' });
  }
});

app.get('/api/lines', async (req, res) => {
  try {
    const lines = await loadTubeLines();
    res.json(lines);
  } catch (error) {
    console.error('Error in /api/lines:', error);
    res.status(500).json({ error: 'Failed to load lines' });
  }
});

app.get('/api/line/:lineId/status', async (req, res) => {
  try {
    const { lineId } = req.params;
    const status = await makeApiRequest(`/Line/${lineId}/Status`);
    res.json(status);
  } catch (error) {
    console.error('Error fetching line status:', error.message);
    res.status(500).json({ error: 'Failed to fetch line status', message: error.message });
  }
});

app.get('/api/line/:lineId/route', async (req, res) => {
  try {
    const { lineId } = req.params;
    const direction = req.query.direction || 'all';
    const cacheKey = `${lineId}:${direction}`;
    const cached = lineRouteCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < ROUTE_CACHE_DURATION) {
      return res.json({ routeSegments: cached.data });
    }

    const routeSequence = await makeApiRequest(`/Line/${encodeURIComponent(lineId)}/Route/Sequence/${direction}`);
    if (!routeSequence || !Array.isArray(routeSequence.lineStrings)) {
      throw new Error('Invalid route sequence response');
    }

    const routeSegments = routeSequence.lineStrings.flatMap((routeString) => {
      try {
        const parsed = JSON.parse(routeString);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .filter(segment => Array.isArray(segment))
          .map(segment => segment
            .filter(point => Array.isArray(point) && point.length >= 2)
            .map(point => ({ lat: point[1], lon: point[0] }))
          )
          .filter(segment => segment.length >= 2);
      } catch (e) {
        return [];
      }
    }).filter(segment => segment.length >= 2);

    lineRouteCache.set(cacheKey, { timestamp: Date.now(), data: routeSegments });
    res.json({ routeSegments });
  } catch (error) {
    console.error('Error fetching line route:', error.message);
    res.status(500).json({ error: 'Failed to fetch line route', message: error.message });
  }
});

app.get('/api/stoppoint/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cached = stopPointSearchCache.get(normalizedQuery);
    if (cached && (Date.now() - cached.timestamp) < STOP_SEARCH_CACHE_DURATION) {
      return res.json(cached.data);
    }

    const queryString = `/StopPoint/Search?query=${encodeURIComponent(query)}&modes=tube`;
    const results = await makeApiRequest(queryString);
    const data = results.matches ? results : { matches: results };
    stopPointSearchCache.set(normalizedQuery, { timestamp: Date.now(), data });
    res.json(data);
  } catch (error) {
    console.error('Error searching stops:', error.message);
    const fallback = stopPointSearchCache.get(req.query.query?.trim().toLowerCase());
    if (fallback) return res.json(fallback.data);
    res.json({ matches: [] });
  }
});

app.get('/api/stoppoint/:stopId/arrivals', async (req, res) => {
  try {
    const { stopId } = req.params;
    const arrivals = await makeApiRequest(`/StopPoint/${stopId}/Arrivals`);
    const sorted = arrivals
      .sort((a, b) => a.timeToStation - b.timeToStation)
      .slice(0, 10);
    res.json(sorted);
  } catch (error) {
    console.error('Error fetching arrivals:', error.message);
    res.json([]);
  }
});

function normalizeCrowding(crowding) {
  if (!crowding || typeof crowding !== 'string') {
    return 'Moderate';
  }
  const lower = crowding.toLowerCase();
  if (lower.includes('severe') || lower.includes('very')) return 'Very Busy';
  if (lower.includes('busy')) return 'Busy';
  if (lower.includes('moderate')) return 'Moderate';
  if (lower.includes('quiet')) return 'Quiet';
  return 'Moderate';
}

function mapArrivalToTrain(arrival) {
  const timeToStation = Number(arrival.timeToStation) || 0;
  const progress = Math.min(100, Math.max(0, 100 - Math.round((timeToStation / 120) * 100)));
  return {
    id: arrival.vehicleId || `${arrival.lineName}-${arrival.platformName || arrival.stationName || arrival.towards}-${arrival.destinationName}`.replace(/\s+/g, '_'),
    line: arrival.lineName,
    destination: arrival.destinationName || arrival.towards || 'Unknown',
    nextStation: arrival.stationName || arrival.platformName || arrival.towards || 'Next stop',
    currentPosition: 1,
    progress,
    status: timeToStation <= 30 ? 'Due' : 'Running',
    passengers: normalizeCrowding(arrival.crowding),
    timeToStation,
    expectedArrival: arrival.expectedArrival
  };
}

async function fetchLiveTfLTrains() {
  const lines = await loadTubeLines();
  const lineIds = lines.map(line => (line.id || line.name || '').toLowerCase()).filter(Boolean).join(',');
  if (!lineIds) {
    throw new Error('No line IDs available for live TfL arrivals');
  }

  const arrivals = await makeApiRequest(`/Line/${encodeURIComponent(lineIds)}/Arrivals`);
  if (!Array.isArray(arrivals)) {
    throw new Error('Unexpected TfL arrivals format');
  }
  return arrivals
    .sort((a, b) => (a.timeToStation || 0) - (b.timeToStation || 0))
    .slice(0, 150)
    .map(mapArrivalToTrain);
}

app.get('/api/live-trains', async (req, res) => {
  try {
    const trains = await fetchLiveTfLTrains();
    res.json({ trains });
  } catch (error) {
    console.error('Error fetching live trains from TfL:', error.message);
    const fallback = require('./public/trains-tracking.json');
    res.json(fallback);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket connection for live updates
let liveTrainCache = null;
let trainUpdateInterval = null;

io.on('connection', async (socket) => {
  console.log('New client connected:', socket.id);
  
  if (!liveTrainCache) {
    try {
      const trains = await fetchLiveTfLTrains();
      liveTrainCache = { trains };
    } catch (error) {
      console.error('Error loading TfL live trains:', error.message);
      liveTrainCache = require('./public/trains-tracking.json');
    }
  }

  socket.emit('initial-trains', liveTrainCache);
  
  if (!trainUpdateInterval) {
    trainUpdateInterval = setInterval(async () => {
      try {
        const trains = await fetchLiveTfLTrains();
        liveTrainCache = { trains };
        io.emit('train-update', liveTrainCache);
      } catch (error) {
        console.error('Error updating trains:', error.message);
      }
    }, 15000);
  }
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Integrating with TfL API for real-time data...');
});