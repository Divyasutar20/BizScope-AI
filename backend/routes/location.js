const express = require('express');
const axios = require('axios');

const router = express.Router();

const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

router.post('/nearby', async (req, res) => {
  const { lat, lng, radius = 500, businessCategory = null } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ message: 'lat and lng are required' });
  }

  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["shop"](around:${radius},${lat},${lng});
      node["amenity"](around:${radius},${lat},${lng});
    );
    out body;
  `;

  let lastError = null;

  for (const mirror of OVERPASS_MIRRORS) {
    try {
      console.log(`Trying Overpass mirror: ${mirror}`);
      const response = await axios.post(
        mirror,
        `data=${encodeURIComponent(overpassQuery)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'BizScopeAI/1.0 (student project)',
          },
          timeout: 20000,
        }
      );

      const places = response.data.elements.map((el) => ({
        id: el.id,
        lat: el.lat,
        lng: el.lon,
        name: el.tags?.name || 'Unnamed',
        type: el.tags?.shop || el.tags?.amenity || 'unknown',
      }));

      const categoryCounts = {};
      places.forEach((p) => {
        categoryCounts[p.type] = (categoryCounts[p.type] || 0) + 1;
      });

     
        const competitorPlaces = businessCategory
        ? places.filter((p) => p.type.toLowerCase() === businessCategory.toLowerCase())
        : [];
      const otherPlaces = businessCategory
        ? places.filter((p) => p.type.toLowerCase() !== businessCategory.toLowerCase())
        : places;
      const directCompetitors = businessCategory ? competitorPlaces.length : null;

      const analysis = {
        totalNearbyPlaces: places.length,
        categoryCounts,
        directCompetitors,
        competitionLevel:
          directCompetitors === null
            ? 'unknown'
            : directCompetitors === 0
            ? 'low'
            : directCompetitors <= 2
            ? 'moderate'
            : 'high',
      };

      let mlResult = null;
      try {
        const mlResponse = await axios.post('http://localhost:5001/predict', analysis, {
          timeout: 5000,
        });
        mlResult = mlResponse.data;
      } catch (mlErr) {
        console.error('ML service call failed:', mlErr.message);
      }
      return res.json({
        count: places.length,
        places,
        competitorPlaces,
        otherPlaces,
        source: mirror,
        analysis,
        businessSuccessScore: mlResult?.business_success_score ?? null,
      });
      
    } catch (err) {
      console.error(`Mirror ${mirror} failed:`, err.message);
      lastError = err;
    }
  }

  res.status(500).json({
    message: 'All Overpass mirrors failed',
    error: lastError?.message,
  });
});

module.exports = router;