import { MapContainer, TileLayer, Marker, CircleMarker, Circle, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import {
  FaMapMarkedAlt, FaSignOutAlt, FaStore, FaBuilding, FaLightbulb, FaSearch, FaMapPin, FaTrophy, FaQuoteLeft,
} from 'react-icons/fa';
import ChatBot from '../components/ChatBot';

const BUSINESS_CATEGORIES = [
  { key: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { key: 'cafe', label: 'Cafe', icon: '☕' },
  { key: 'fast_food', label: 'Fast Food', icon: '🍔' },
  { key: 'pharmacy', label: 'Pharmacy', icon: '💊' },
  { key: 'clothes', label: 'Clothing', icon: '👕' },
  { key: 'bakery', label: 'Bakery', icon: '🥐' },
  { key: 'bank', label: 'Bank', icon: '🏦' },
  { key: 'supermarket', label: 'Supermarket', icon: '🛒' },
  { key: 'hairdresser', label: 'Salon', icon: '💇' },
  { key: 'fitness_centre', label: 'Gym', icon: '🏋️' },
  { key: 'hardware', label: 'Hardware', icon: '🔧' },
  { key: 'electronics', label: 'Electronics', icon: '📱' },
  { key: 'stationery', label: 'Stationery', icon: '📚' },
  { key: 'mobile_phone', label: 'Mobile Shop', icon: '📲' },
  { key: 'jewelry', label: 'Jewelry', icon: '💍' },
  { key: 'hotel', label: 'Hotel', icon: '🏨' },
];

const RADIUS_OPTIONS = [
  { label: '1 km', value: 1000 },
  { label: '3 km', value: 3000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
];

function catInfo(key) {
  return BUSINESS_CATEGORIES.find((c) => c.key === key) || { label: key, icon: '🏪' };
}

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

function FlyToLocation({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 15);
    }
  }, [target, map]);
  return null;
}

function buildGuide({ label, score, analysis, topPick, businessCategory }) {
  if (!analysis || score === null) return null;
  const parts = [];

  if (score >= 75) parts.push(`This location looks strong for a ${label}.`);
  else if (score >= 50) parts.push(`This location is moderately suitable for a ${label}.`);
  else parts.push(`This location looks weak for a ${label}.`);

  if (analysis.directCompetitors === 0) {
    parts.push(`There are currently no direct ${label} competitors in this radius — a potential market gap.`);
  } else {
    parts.push(
      `There ${analysis.directCompetitors === 1 ? 'is' : 'are'} ${analysis.directCompetitors} existing ${label} competitor${analysis.directCompetitors === 1 ? '' : 's'} nearby (${analysis.competitionLevel} competition).`
    );
  }

  if (analysis.complementaryCount > 0) {
    parts.push(`It also has ${analysis.complementaryCount} nearby places that typically drive demand for this type of business.`);
  }

  if (topPick && topPick.category !== businessCategory) {
    parts.push(`If you're flexible, ${catInfo(topPick.category).label} scores highest here (${topPick.score}/100).`);
  }

  return parts.join(' ');
}

function ScoreDial({ score, loading, label }) {
  const value = score ?? 0;
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="relative w-32 h-32 rounded-full flex items-center justify-center shadow-inner"
        style={{ background: `conic-gradient(#2dd4bf ${value * 3.6}deg, #334155 ${value * 3.6}deg)` }}
      >
        <div className="absolute inset-[6px] bg-slate-900 rounded-full flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-teal-300">
            {score !== null ? score : loading ? '…' : '—'}
          </span>
          <span className="text-[10px] text-slate-400 -mt-1">/ 100</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 font-medium mt-2 text-center">{label} Success Score</p>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const loggedInName = localStorage.getItem('name');

  const [businessCategory, setBusinessCategory] = useState('restaurant');
  const [categorySearch, setCategorySearch] = useState('');
  const [radius, setRadius] = useState(3000);
  const [lastLocation, setLastLocation] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);

  const [competitorPlaces, setCompetitorPlaces] = useState([]);
  const [otherPlaces, setOtherPlaces] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [score, setScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchNearby = async (latlng, category, rad) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await axios.post('http://localhost:5000/api/location/nearby', {
        lat: latlng.lat,
        lng: latlng.lng,
        radius: rad,
        businessCategory: category,
      });
      setCompetitorPlaces(res.data.competitorPlaces || []);
      setOtherPlaces(res.data.otherPlaces || []);
      setAnalysis(res.data.analysis);
      setScore(res.data.businessSuccessScore);
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleLocationSelect = (latlng) => {
    setLastLocation(latlng);
    fetchNearby(latlng, businessCategory, radius);
  };

  useEffect(() => {
    if (placeQuery.trim().length < 3) {
      setPlaceResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setPlaceSearchLoading(true);
      try {
        const res = await axios.get('http://localhost:5000/api/location/search', {
          params: { q: placeQuery },
        });
        setPlaceResults(res.data.results || []);
      } catch (err) {
        console.error(err);
      }
      setPlaceSearchLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [placeQuery]);

  const handleCategoryChange = (catKey) => {
    setBusinessCategory(catKey);
    if (lastLocation) fetchNearby(lastLocation, catKey, radius);
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    if (lastLocation) fetchNearby(lastLocation, businessCategory, newRadius);
  };

  const handlePlaceSearch = async (e) => {
    e.preventDefault();
    if (!placeQuery.trim()) return;
    setPlaceSearchLoading(true);
    setPlaceResults([]);
    try {
      const res = await axios.get('http://localhost:5000/api/location/search', {
        params: { q: placeQuery },
      });
      setPlaceResults(res.data.results || []);
    } catch (err) {
      console.error(err);
    }
    setPlaceSearchLoading(false);
  };

  const handlePlaceSelect = (place) => {
    const latlng = { lat: place.lat, lng: place.lng };
    setPlaceResults([]);
    setPlaceQuery(place.displayName);
    setFlyTarget(latlng);
    setLastLocation(latlng);
    fetchNearby(latlng, businessCategory, radius);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const competitionColor = {
    low: 'bg-teal-100 text-teal-700',
    moderate: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
  };

  const selectedLabel = catInfo(businessCategory).label;
  const topPick = recommendations[0];
  const selectedRank = recommendations.findIndex((r) => r.category === businessCategory);
  const showSwitchHint = topPick && selectedRank > 2 && topPick.category !== businessCategory;
  const guideText = buildGuide({ label: selectedLabel, score, analysis, topPick, businessCategory });

  const filteredCategories = BUSINESS_CATEGORIES.filter((cat) =>
    cat.label.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 relative">
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <pattern id="bg-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#0f172a" opacity="0.08" />
          </pattern>
          <linearGradient id="skyline-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg-dots)" />
        <rect width="100%" height="100%" fill="url(#skyline-fade)" />
        <g fill="#0f172a" opacity="0.05">
          <rect x="60" y="700" width="70" height="200" />
          <rect x="150" y="640" width="55" height="260" />
          <rect x="220" y="720" width="90" height="180" />
          <rect x="330" y="600" width="60" height="300" />
          <rect x="410" y="680" width="75" height="220" />
          <rect x="1150" y="660" width="70" height="240" />
          <rect x="1240" y="600" width="55" height="300" />
          <rect x="1310" y="710" width="90" height="190" />
          <rect x="1420" y="640" width="60" height="260" />
          <rect x="1500" y="690" width="75" height="210" />
        </g>
        <path d="M 200 300 Q 500 150 800 280 T 1400 250" stroke="#0d9488" strokeWidth="3" strokeDasharray="8 10" fill="none" opacity="0.12" />
        <g fill="#0d9488" opacity="0.1">
          <circle cx="200" cy="300" r="10" />
          <circle cx="800" cy="280" r="10" />
          <circle cx="1400" cy="250" r="10" />
        </g>
      </svg>
      <div className="relative z-10">
      {/* Sticky header */}
      <div className="sticky top-0 z-[1100] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <FaMapMarkedAlt className="text-teal-400 text-2xl" />
            <h1 className="text-xl font-bold tracking-tight">BizScope AI</h1>
          </div>
          <p className="text-slate-400 text-xs">
            Intelligent business site selection & success prediction for Kolhapur
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-slate-300 text-sm">Welcome, <span className="font-semibold text-white">{loggedInName}</span></p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs border border-slate-600 hover:bg-slate-700 hover:border-slate-500 transition-colors px-3 py-2 rounded-lg text-slate-300"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Search bars */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-4 flex flex-col md:flex-row gap-3">
          <form onSubmit={handlePlaceSearch} className="relative flex-1">
            <div className="flex items-center gap-2 border-2 border-slate-100 focus-within:border-teal-500 transition-colors rounded-xl px-4 py-3 bg-slate-50">
              <FaMapPin className="text-teal-600 shrink-0" />
              <input
                type="text"
                value={placeQuery}
                onChange={(e) => setPlaceQuery(e.target.value)}
                placeholder="Search a location — e.g. Kasaba Bawada, Kolhapur"
                className="flex-1 text-sm outline-none bg-transparent"
              />
              <button type="submit" className="text-xs bg-slate-900 hover:bg-slate-800 transition-colors text-white px-4 py-2 rounded-lg shrink-0 font-medium">
                {placeSearchLoading ? '...' : 'Search'}
              </button>
            </div>
            {placeResults.length > 0 && (
              <ul className="absolute z-[1200] top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                {placeResults.map((place, i) => (
                  <li
                    key={i}
                    onClick={() => handlePlaceSelect(place)}
                    className="px-4 py-3 text-sm hover:bg-teal-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                  >
                    {place.displayName}
                  </li>
                ))}
              </ul>
            )}
          </form>

          <div className="relative flex-1">
            <div className="flex items-center gap-2 border-2 border-slate-100 focus-within:border-teal-500 transition-colors rounded-xl px-4 py-3 bg-slate-50">
              <FaSearch className="text-teal-600 shrink-0" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search a business type — e.g. cafe, gym, pharmacy"
                className="flex-1 text-sm outline-none bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Choose a Business Type</h3>
          <div className="flex items-center gap-3 overflow-x-auto pb-3">
            {filteredCategories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                className={`flex flex-col items-center justify-center gap-2 px-5 py-4 rounded-2xl text-xs font-semibold border-2 transition-all shrink-0 w-[104px] ${
                  businessCategory === cat.key
                    ? 'bg-gradient-to-br from-slate-900 to-slate-700 text-white border-slate-900 shadow-lg scale-105'
                    : 'bg-white text-slate-600 border-slate-100 hover:border-teal-300 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <span className="text-3xl">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
            {filteredCategories.length === 0 && (
              <p className="text-xs text-slate-400 italic py-2">No business type matches "{categorySearch}".</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase">Radius:</span>
            <select
              value={radius}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              className="border-2 border-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 transition-colors"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400">
              {lastLocation
                ? `Showing ${selectedLabel} locations (red dots) within the highlighted ring.`
                : `Search a location or click the map to analyze it for ${selectedLabel}.`}
            </span>
            {loading && <span className="text-xs text-teal-600 font-semibold animate-pulse">Analyzing all business types…</span>}
          </div>
        </div>

        {/* Map */}
        <div className="rounded-2xl shadow-md border border-slate-100 overflow-hidden h-[55vh]">
          <MapContainer center={[16.7050, 74.2433]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <MapClickHandler onLocationSelect={handleLocationSelect} />
            <FlyToLocation target={flyTarget} />
            {lastLocation && (
              <>
                <Marker position={[lastLocation.lat, lastLocation.lng]}>
                  <Popup>Selected location</Popup>
                </Marker>
                <Circle
                  center={[lastLocation.lat, lastLocation.lng]}
                  radius={radius}
                  pathOptions={{ color: '#0f172a', fillColor: '#0d9488', fillOpacity: 0.08, weight: 2 }}
                />
              </>
            )}
            {competitorPlaces.map((place) => (
              <CircleMarker
                key={place.id}
                center={[place.lat, place.lng]}
                radius={8}
                pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.8, weight: 2 }}
              >
                <Popup>{place.name} ({place.type})</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Guide banners */}
        {guideText && (
          <div className="flex items-start gap-3 bg-white border border-slate-100 shadow-md text-slate-700 text-sm px-5 py-4 rounded-2xl">
            <FaLightbulb className="shrink-0 mt-0.5 text-teal-600 text-lg" />
            <span>{guideText}</span>
          </div>
        )}

        {showSwitchHint && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 shadow-md text-amber-800 text-sm px-5 py-4 rounded-2xl">
            <FaLightbulb className="shrink-0 text-lg" />
            <span>
              <strong>{selectedLabel}</strong> ranks #{selectedRank + 1} here. A{' '}
              <strong>{catInfo(topPick.category).label}</strong> would likely perform better
              (score {topPick.score} vs {score ?? '—'}).
            </span>
          </div>
        )}

        {/* Results grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {hasSearched && (
            <motion.div
              key={score}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 flex flex-col items-center justify-center"
            >
              <FaTrophy className="text-amber-400 text-xl mb-2" />
              <ScoreDial score={score} loading={loading} label={selectedLabel} />
            </motion.div>
          )}

          {analysis && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 space-y-3 text-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Analysis</h4>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Direct competitors</span>
                <strong className="text-slate-900">{analysis.directCompetitors}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Competition level</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${competitionColor[analysis.competitionLevel] || ''}`}>
                  {analysis.competitionLevel}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total places in radius</span>
                <strong className="text-slate-900">{analysis.totalNearbyPlaces}</strong>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <FaStore className="text-teal-600" /> Competitors ({selectedLabel})
            </h4>
            {!hasSearched && <p className="text-xs text-slate-400 italic">Search a location or click the map.</p>}
            {hasSearched && !loading && competitorPlaces.length === 0 && (
              <p className="text-xs text-slate-400 italic">No direct competitors found.</p>
            )}
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {competitorPlaces.map((place) => (
                <li key={place.id} className="text-sm border-b border-slate-50 pb-2">
                  <div className="font-medium text-slate-800">{place.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{place.type}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <FaBuilding className="text-teal-600" /> Other Nearby Places
            </h4>
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {otherPlaces.map((place) => (
                <li key={place.id} className="text-sm border-b border-slate-50 pb-2">
                  <div className="font-medium text-slate-800">{place.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{place.type}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <FaLightbulb className="text-teal-600" /> Best Businesses Here
            </h4>
            {!hasSearched && <p className="text-xs text-slate-400 italic">Search a location to see rankings.</p>}
            <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {recommendations.slice(0, 8).map((rec, i) => (
                <li
                  key={rec.category}
                  className={`flex items-center justify-between text-xs px-3 py-2 rounded-xl transition-colors ${
                    rec.category === businessCategory ? 'bg-teal-50 font-semibold' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-400 w-4">{i + 1}.</span>
                    <span className="text-base">{catInfo(rec.category).icon}</span>
                    {catInfo(rec.category).label}
                  </span>
                  <span className="font-bold text-teal-700">{rec.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer quote */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-lg px-8 py-10 text-center mt-10">
          <FaQuoteLeft className="text-teal-500 text-2xl mx-auto mb-4" />
          <p className="text-slate-200 text-lg italic max-w-2xl mx-auto leading-relaxed">
            "The right location doesn't guarantee success — but the wrong one guarantees a much harder fight."
          </p>
          <p className="text-slate-500 text-xs mt-4 uppercase tracking-wide">BizScope AI — Data-driven site selection</p>
        </div>
      </div>
      </div>

      <ChatBot
        hasSearched={hasSearched}
        businessCategory={businessCategory}
        score={score}
        analysis={analysis}
        recommendations={recommendations}
        categories={BUSINESS_CATEGORIES}
      />
    </div>
  );
}

export default DashboardPage;