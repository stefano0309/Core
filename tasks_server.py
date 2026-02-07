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
        # Habits deve essere un dizionario {}, Tasks/Routine una lista []
        return {} if "habits" in file_path else []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return {} if "habits" in file_path else []
            return json.loads(content)
    except Exception as e:
        print(f"// ERRORE CARICAMENTO {file_path}: {e}")
        return {} if "habits" in file_path else []

def save_data(file_path, data):
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"// LOG: {file_path} SCRITTO CON SUCCESSO")
    except Exception as e:
        print(f"// ERRORE SCRITTURA {file_path}: {e}")

# --- ROTTE API HABITS (LE DUE NUOVE FUNZIONI) ---

@app.route('/habits', methods=['GET'])
def get_habits_data():
    """Restituisce i dati delle abitudini (Heatmap)"""
    data = load_data(HABITS_FILE)
    # Forza il ritorno di un oggetto se per errore fosse una lista
    if not isinstance(data, dict): data = {}
    return jsonify(data)

@app.route('/habits', methods=['POST'])
def update_habits_data():
    """Riceve e salva i dati delle abitudini dal frontend"""
    habits_data = request.json
    if habits_data is not None:
        save_data(HABITS_FILE, habits_data)
        return jsonify({"status": "success", "message": "HABITS_UPDATED"}), 200
    return jsonify({"status": "error", "message": "INVALID_DATA"}), 400

# --- ALTRE ROTTE ---

@app.route('/tasks', methods=['GET', 'POST'])
def handle_tasks():
    if request.method == 'POST':
        save_data(TASKS_FILE, request.json)
        return jsonify({"status": "success"}), 200
    return jsonify(load_data(TASKS_FILE))

@app.route('/routine', methods=['GET', 'POST'])
def handle_routine():
    if request.method == 'POST':
        save_data(ROUTINE_FILE, request.json)
        return jsonify({"status": "success"}), 200
    return jsonify(load_data(ROUTINE_FILE))

@app.route('/routine/reset', methods=['POST'])
def reset_routine():
    save_data(ROUTINE_FILE, [])
    return jsonify({"status": "reset completato"}), 200

if __name__ == '__main__':
    # Creazione file habits se non esiste per evitare errori al primo avvio
    if not os.path.exists(HABITS_FILE):
        save_data(HABITS_FILE, {})
        
    app.run(host='0.0.0.0', port=5000, debug=True)