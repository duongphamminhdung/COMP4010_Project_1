"""Flask API for penguin group comparison."""

from flask import Flask, jsonify, request
from flask_cors import CORS

from utils import build_comparison, normalize_sex_param

app = Flask(__name__)
CORS(app)


@app.get("/compare")
def compare_groups():
    """Compare two species+island groups and return KPI/chart payload."""
    species_a = request.args.get("speciesA")
    island_a = request.args.get("islandA")
    sex_a = request.args.get("sexA")
    species_b = request.args.get("speciesB")
    island_b = request.args.get("islandB")
    sex_b = request.args.get("sexB")

    required = {
        "speciesA": species_a,
        "islandA": island_a,
        "sexA": sex_a,
        "speciesB": species_b,
        "islandB": island_b,
        "sexB": sex_b,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        return (
            jsonify(
                {
                    "error": "Missing required query params.",
                    "missing": missing,
                }
            ),
            400,
        )

    try:
        normalize_sex_param(sex_a)
        normalize_sex_param(sex_b)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    result = build_comparison(species_a, island_a, sex_a, species_b, island_b, sex_b)
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
