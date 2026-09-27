import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from 'react-leaflet';
import { useState } from 'react';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './App.css';
import Auth from './components/Auth';

const BUSINESS_CATEGORIES = ['restaurant', 'cafe', 'pharmacy', 'clothes', 'bakery', 'bank', 'supermarket'];
const RADIUS_OPTIONS = [
  { label: '1 km', value: 1000 },
  { label: '3 km', value: 3000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
];

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
      <Popup>
        Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}
      </Popup>
    </Marker>
  );
}

function App() {
  const [loggedInName, setLoggedInName] = useState(localStorage.getItem('name') || null);
  const [businessCategory, setBusinessCategory] = useState('restaurant');
  const [radius, setRadius] = useState(3000);
  const [competitorPlaces, setCompetitorPlaces] = useState([]);
  const [otherPlaces, setOtherPlaces] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleLocationSelect = async (latlng) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await axios.post('http://localhost:5000/api/location/nearby', {
        lat: latlng.lat,
        lng: latlng.lng,
        radius,
        businessCategory,
      });
      setCompetitorPlaces(res.data.competitorPlaces || []);
      setOtherPlaces(res.data.otherPlaces || []);
      setAnalysis(res.data.analysis);
      setScore(res.data.businessSuccessScore);
    } catch (err) {
      console.error('Error fetching nearby places:', err);
    }
    setLoading(false);
  };

  if (!loggedInName) {
    return <Auth onLogin={setLoggedInName} />;
  }

  const allMarkers = [...competitorPlaces, ...otherPlaces];

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>BizScope AI</h1>
          <p>Welcome, {loggedInName}</p>
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.clear();
              setLoggedInName(null);
            }}
          >
            Logout
          </button>
        </div>

        <div className="sidebar-section">
          <h4>Search Parameters</h4>
          <div className="control-row">
            <select value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)}>
              {BUSINESS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              {RADIUS_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <p className="hint">Pick a category and radius, then click a spot on the map.</p>
          {loading && <p className="loading-text">Analyzing location…</p>}
        </div>

        {score !== null && (
          <div className="sidebar-section">
            <div className="score-card">
              <p className="score-label">Business Success Score</p>
              <div className="score-number">{score}<span> / 100</span></div>
            </div>
          </div>
        )}

        {analysis && (
          <div className="sidebar-section">
            <h4>Analysis</h4>
            <div className="stat-row">
              <span className="stat-label">Direct competitors ({businessCategory})</span>
              <strong>{analysis.directCompetitors}</strong>
            </div>
            <div className="stat-row">
              <span className="stat-label">Competition level</span>
              <span className={`tag tag-${analysis.competitionLevel}`}>{analysis.competitionLevel}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Total places in radius</span>
              <strong>{analysis.totalNearbyPlaces}</strong>
            </div>
          </div>
        )}

        <div className="sidebar-section">
          <h4>Competitors ({businessCategory})</h4>
          {!hasSearched && <p className="empty-hint">Click the map to search.</p>}
          {hasSearched && !loading && competitorPlaces.length === 0 && (
            <p className="empty-hint">No direct competitors found in this radius.</p>
          )}
          <ul className="place-list">
            {competitorPlaces.map((place) => (
              <li key={place.id} className="place-item">
                <div className="place-name">{place.name}</div>
                <div className="place-type">{place.type}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-section">
          <h4>Other Nearby Places</h4>
          {hasSearched && !loading && otherPlaces.length === 0 && (
            <p className="empty-hint">Nothing else found in this radius.</p>
          )}
          <ul className="place-list">
            {otherPlaces.map((place) => (
              <li key={place.id} className="place-item">
                <div className="place-name">{place.name}</div>
                <div className="place-type">{place.type}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="map-area">
        <MapContainer
          center={[16.7050, 74.2433]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
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
    </div>
  );
}

export default App;