import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from 'react-leaflet';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { FaMapMarkedAlt, FaSignOutAlt, FaStore, FaBuilding, FaLightbulb } from 'react-icons/fa';

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

function LocationMarker({ onLocationSelect }) {
  const [position, setPosition] = useState(null);
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng);
    },
  });
  return position === null ? null : (
    <Marker position={position}>
      <Popup>Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}</Popup>
    </Marker>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const loggedInName = localStorage.getItem('name');
  const [businessCategory, setBusinessCategory] = useState('restaurant');
  const [radius, setRadius] = useState(3000);
  const [lastLocation, setLastLocation] = useState(null);
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

  const handleCategoryChange = (catKey) => {
    setBusinessCategory(catKey);
    if (lastLocation) fetchNearby(lastLocation, catKey, radius);
  };

  const handleRadiusChange = (newRadius) => {
    setRadius(newRadius);
    if (lastLocation) fetchNearby(lastLocation, businessCategory, newRadius);
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

  const allMarkers = [...competitorPlaces, ...otherPlaces];
  const selectedLabel = catInfo(businessCategory).label;

  const topPick = recommendations[0];
  const selectedRank = recommendations.findIndex((r) => r.category === businessCategory);
  const showSwitchHint =
    topPick && selectedRank > 2 && topPick.category !== businessCategory;

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Top header */}
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FaMapMarkedAlt className="text-teal-400 text-xl" />
          <h1 className="text-lg font-bold">BizScope AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-slate-400 text-sm">Welcome, {loggedInName}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs border border-slate-600 hover:bg-slate-800 px-3 py-1.5 rounded-md text-slate-300"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 mb-2">
          {BUSINESS_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all shrink-0 w-[88px] ${
                businessCategory === cat.key
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase">Radius:</span>
          <select
            value={radius}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400">
            {lastLocation ? `Showing results for ${selectedLabel}.` : `Click the map to analyze a location for ${selectedLabel}.`}
          </span>
          {loading && <span className="text-xs text-teal-600 font-medium">Analyzing all business types…</span>}
        </div>
      </div>

      {/* Map on top */}
      <div className="flex-[3] min-h-0">
        <MapContainer center={[16.7050, 74.2433]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <LocationMarker onLocationSelect={handleLocationSelect} />
          {allMarkers.map((place) => (
            <Marker key={place.id} position={[place.lat, place.lng]}>
              <Popup>{place.name} ({place.type})</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Findings below the map */}
      <div className="flex-[2] min-h-0 bg-white border-t border-slate-200 overflow-y-auto">
        {showSwitchHint && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2.5 rounded-lg">
            <FaLightbulb className="shrink-0" />
            <span>
              <strong>{selectedLabel}</strong> ranks #{selectedRank + 1} here. A{' '}
              <strong>{catInfo(topPick.category).label}</strong> would likely perform better
              (score {topPick.score} vs {score ?? '—'}).
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 px-6 py-5">
          {score !== null && (
            <motion.div
              key={score}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-slate-900 rounded-xl p-5 text-white flex flex-col justify-center"
            >
              <p className="text-xs text-slate-400 mb-1">{selectedLabel} Score</p>
              <p className="text-4xl font-bold text-teal-300">
                {score}<span className="text-lg text-slate-400 font-medium"> / 100</span>
              </p>
            </motion.div>
          )}

          {analysis && (
            <div className="space-y-2 text-sm">
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Analysis</h4>
              <div className="flex justify-between">
                <span className="text-slate-500">Direct competitors</span>
                <strong>{analysis.directCompetitors}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Competition level</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${competitionColor[analysis.competitionLevel] || ''}`}>
                  {analysis.competitionLevel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total places in radius</span>
                <strong>{analysis.totalNearbyPlaces}</strong>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
              <FaStore /> Competitors ({selectedLabel})
            </h4>
            {!hasSearched && <p className="text-xs text-slate-400 italic">Click the map to search.</p>}
            {hasSearched && !loading && competitorPlaces.length === 0 && (
              <p className="text-xs text-slate-400 italic">No direct competitors found.</p>
            )}
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {competitorPlaces.map((place) => (
                <li key={place.id} className="text-sm border-b border-slate-50 pb-2">
                  <div className="font-medium text-slate-800">{place.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{place.type}</div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
              <FaBuilding /> Other Nearby Places
            </h4>
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {otherPlaces.map((place) => (
                <li key={place.id} className="text-sm border-b border-slate-50 pb-2">
                  <div className="font-medium text-slate-800">{place.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{place.type}</div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
              <FaLightbulb /> Best Businesses Here
            </h4>
            {!hasSearched && <p className="text-xs text-slate-400 italic">Click the map to see rankings.</p>}
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
              {recommendations.slice(0, 6).map((rec, i) => (
                <li
                  key={rec.category}
                  className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${
                    rec.category === businessCategory ? 'bg-slate-100 font-semibold' : ''
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-400 w-4">{i + 1}.</span>
                    <span>{catInfo(rec.category).icon}</span>
                    {catInfo(rec.category).label}
                  </span>
                  <span className="font-bold text-teal-700">{rec.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;