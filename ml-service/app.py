from flask import Flask, request, jsonify

app = Flask(__name__)

def calculate_success_score(data):
    """
    Rule-based scoring model.
    Uses nearby place density, direct competition, and complementary
    businesses (demand signals) to score a location for a business type.
    """
    total_nearby = data.get('totalNearbyPlaces', 0)
    direct_competitors = data.get('directCompetitors', 0)
    competition_level = data.get('competitionLevel', 'unknown')
    complementary_count = data.get('complementaryCount', 0)

    score = 50  # baseline

    # General foot traffic from area density
    if total_nearby > 20:
        score += 10
    elif total_nearby > 10:
        score += 6
    elif total_nearby > 0:
        score += 3

    # Competition penalty/bonus
    if competition_level == 'low':
        score += 15
    elif competition_level == 'moderate':
        score += 3
    elif competition_level == 'high':
        score -= 15

    # Demand bonus: complementary businesses nearby suggest real customer demand
    score += min(20, complementary_count * 4)

    score = max(0, min(100, score))

    return {
        "business_success_score": score,
        "factors": {
            "total_nearby_places": total_nearby,
            "direct_competitors": direct_competitors,
            "competition_level": competition_level,
            "complementary_count": complementary_count,
        }
    }

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    result = calculate_success_score(data)
    return jsonify(result)

@app.route('/')
def home():
    return "BizScope AI ML service is running"

if __name__ == '__main__':
    app.run(port=5001, debug=True)