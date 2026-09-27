const express = require('express');
const axios = require('axios');

const router = express.Router();

const OVERPASS_MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

const CANDIDATE_CATEGORIES = [
  'restaurant', 'cafe', 'fast_food', 'pharmacy', 'clothes', 'bakery',
  'bank', 'supermarket', 'hairdresser', 'fitness_centre', 'hardware',
  'electronics', 'stationery', 'mobile_phone', 'jewelry', 'hotel',
];

// Business types that generate demand for each category, based on real nearby data
const COMPLEMENTARY_MAP = {
  cafe: ['school', 'college', 'university', 'library', 'office'],
  restaurant: ['cinema', 'hotel', 'theatre', 'college'],
  fast_food: ['school', 'college', 'university', 'cinema'],
  pharmacy: ['hospital', 'clinic', 'doctors', 'dentist'],
  clothes: ['mall', 'marketplace', 'supermarket'],
  bakery: ['school', 'cafe', 'supermarket'],
  bank: ['marketplace', 'supermarket', 'mall'],
  supermarket: ['residential', 'bank', 'pharmacy'],
  hairdresser: ['mall', 'supermarket'],
  fitness_centre: ['college', 'university', 'residential'],
  hardware: ['residential'],
  electronics: ['mall', 'supermarket'],
  stationery: ['school', 'college', 'university'],
  mobile_phone: ['mall', 'supermarket', 'electronics'],
  jewelry: ['mall', 'bank'],
  hotel: ['train_station', 'bus_station', 'attraction'],
};

function buildAnalysis(places, category) {
  const competitorPlaces = places.filter((p) => p.type.toLowerCase() === category.toLowerCase());
  const otherPlaces = places.filter((p) => p.type.toLowerCase() !== category.toLowerCase());
  const directCompetitors = competitorPlaces.length;
  const totalNearbyPlaces = places.length;
  const competitionLevel =
    directCompetitors === 0 ? 'low' : directCompetitors <= 2 ? 'moderate' : 'high';

  const complementaryTags = COMPLEMENTARY_MAP[category.toLowerCase()] || [];
  const complementaryCount = places.filter((p) =>
    complementaryTags.includes(p.type.toLowerCase())
  ).length;

  return {
    competitorPlaces,
    otherPlaces,
    analysis: { totalNearbyPlaces, directCompetitors, competitionLevel, complementaryCount },
  };
}

async function getScore(analysis) {
  try {
    const response = await axios.post('http://localhost:5001/predict', analysis, { timeout: 5000 });
    return response.data.business_success_score;
  } catch (err) {
    console.error('ML service call failed:', err.message);
    return null;
  }
}

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
      node["leisure"](around:${radius},${lat},${lng});
      node["tourism"](around:${radius},${lat},${lng});
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
        type: el.tags?.shop || el.tags?.amenity || el.tags?.leisure || el.tags?.tourism || 'unknown',
      }));

      const selectedCategory = businessCategory || CANDIDATE_CATEGORIES[0];
      const { competitorPlaces, otherPlaces, analysis } = buildAnalysis(places, selectedCategory);
      const businessSuccessScore = await getScore(analysis);

      const recommendationResults = await Promise.all(
        CANDIDATE_CATEGORIES.map(async (cat) => {
          const { analysis: catAnalysis } = buildAnalysis(places, cat);
          const score = await getScore(catAnalysis);
          return {
            category: cat,
            score,
            directCompetitors: catAnalysis.directCompetitors,
            competitionLevel: catAnalysis.competitionLevel,
            complementaryCount: catAnalysis.complementaryCount,
          };
        })
      );

      const recommendations = recommendationResults
        .filter((r) => r.score !== null)
        .sort((a, b) => b.score - a.score);

      return res.json({
        count: places.length,
        places,
        competitorPlaces,
        otherPlaces,
        source: mirror,
        analysis,
        businessSuccessScore,
        recommendations,
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