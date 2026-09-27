from flask import Flask, request, jsonify

app = Flask(__name__)

def calculate_success_score(data):
    """
    Simple rule-based scoring model.
    Takes analysis data (competition, category counts, total nearby places)
    and returns a Business Success Score out of 100.
    Replace this with a trained ML model later.
    """
    total_nearby = data.get('totalNearbyPlaces', 0)
    direct_competitors = data.get('directCompetitors', 0)
    competition_level = data.get('competitionLevel', 'unknown')

    score = 50  # baseline

    # More foot-traffic-generating places nearby = more potential customers
    if total_nearby > 20:
        score += 15
    elif total_nearby > 10:
        score += 10
    elif total_nearby > 0:
        score += 5

    # Competition penalty/bonus
    if competition_level == 'low':
        score += 20
    elif competition_level == 'moderate':
        score += 5
    elif competition_level == 'high':
        score -= 15

    # Clamp between 0 and 100
    score = max(0, min(100, score))

    return {
        "business_success_score": score,
        "factors": {
            "total_nearby_places": total_nearby,
            "direct_competitors": direct_competitors,
            "competition_level": competition_level,
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