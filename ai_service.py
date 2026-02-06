from flask import Flask, jsonify
from flask_cors import CORS
import numpy as np
import tensorflow as tf
import requests

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ----------------------------
# Predict next week attendance using TensorFlow
# ----------------------------
@app.route("/predict_next_week_students", methods=["GET"])
def predict_next_week_students():
    try:
        # Fetch grade-wise attendance from Node.js backend
        response = requests.get("http://localhost:5000/api/ai/grade-wise-12weeks")
        data = response.json()

        if not data or len(data) == 0:
            return jsonify({"message": "No attendance found", "records": []})

        predictions = {}

        for grade, students in data.items():
            predictions[grade] = []

            for student in students:
                weeks = student.get('weeks', [])

                # Step 1: Average multiple entries per week
                week_dict = {}
                for w in weeks:
                    week_num = w['week']
                    week_dict[week_num] = week_dict.get(week_num, []) + [w['attendanceRate']]

                avg_weeks = []
                for week_num in sorted(week_dict.keys()):
                    avg_rate = sum(week_dict[week_num]) / len(week_dict[week_num])
                    avg_weeks.append(avg_rate)

                if len(avg_weeks) < 2:
                    next_week = avg_weeks[-1] if avg_weeks else 0
                else:
                    # Step 2: Build TensorFlow regression model
                    X = np.arange(len(avg_weeks)).reshape(-1,1).astype(np.float32)
                    y = np.array(avg_weeks).reshape(-1,1).astype(np.float32)

                    model = tf.keras.Sequential([
                        tf.keras.layers.Dense(8, activation='relu', input_shape=(1,)),
                        tf.keras.layers.Dense(4, activation='relu'),
                        tf.keras.layers.Dense(1)
                    ])
                    model.compile(optimizer='adam', loss='mean_squared_error')
                    model.fit(X, y, epochs=100, verbose=0)

                    next_week = model.predict(np.array([[len(avg_weeks)]]))[0][0]

                # Clamp between 0 and 100
                next_week = float(max(0, min(100, next_week)))

                predictions[grade].append({
                    "studentId": student['studentId'],
                    "fullName": student['fullName'],
                    "predicted_next_week_attendance": round(next_week, 2)
                })

        return jsonify(predictions)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ----------------------------
# AI-Powered Recommendations + Clustering
# ----------------------------
@app.route("/recommend_weak_students", methods=["GET"])
def recommend_weak_students():
    try:
        # Get predicted attendance
        response = requests.get("http://localhost:5001/predict_next_week_students")
        data = response.json()

        recommendations = {}

        for grade, students in data.items():
            recommendations[grade] = []

            for s in students:
                rate = float(s["predicted_next_week_attendance"])

                # Step 1: Generate recommendation and cluster
                if rate < 60:
                    rec = "High risk — needs more practice and class participation."
                    cluster = "Weak"
                elif rate < 80:
                    rec = "Moderate performance — revise weak topics."
                    cluster = "Average"
                else:
                    rec = "Good consistency — maintain current learning pattern."
                    cluster = "Strong"

                recommendations[grade].append({
                    "studentId": s["studentId"],
                    "fullName": s["fullName"],
                    "predicted_next_week_attendance": round(rate, 2),
                    "recommendation": rec,
                    "cluster": cluster
                })

        return jsonify(recommendations)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5001)
