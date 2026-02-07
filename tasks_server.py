from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

TASKS_FILE = "tasks.json"
ROUTINE_FILE = "routine.json"
HABITS_FILE = "habits.json"

# --- LOGICA DI CARICAMENTO/SALVATAGGIO ---

def load_data(file_path):
    if not os.path.exists(file_path):
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            return json.loads(content) if content else []
    except Exception as e:
        print(f"Errore caricamento {file_path}: {e}")
        return []

def save_data(file_path, data):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# --- ROTTE API ---

@app.route('/tasks', methods=['GET'])
def get_tasks():
    return jsonify(load_data(TASKS_FILE))

@app.route('/tasks', methods=['POST'])
def update_tasks():
    tasks = request.json
    if isinstance(tasks, list):
        save_data(TASKS_FILE, tasks)
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error"}), 400

@app.route('/routine', methods=['GET'])
def get_routine():
    # Corretto: ora restituisce un JSON valido al browser
    return jsonify(load_data(ROUTINE_FILE))

@app.route('/routine', methods=['POST'])
def save_routine():
    routine_data = request.json
    save_data(ROUTINE_FILE, routine_data)
    return jsonify({"status": "success"}), 200

# Rotta opzionale per il reset manuale/automatico via API
@app.route('/routine/reset', methods=['POST'])
def reset_routine():
    save_data(ROUTINE_FILE, [])
    return jsonify({"status": "reset completato"}), 200

@app.route('/habits', methods=['GET'])
def get_habits():
    return jsonify(load_data(HABITS_FILE))

@app.route('/habits', methods=['POST'])
def save_habits():
    habits_data = request.json
    save_data(HABITS_FILE, habits_data)
    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
