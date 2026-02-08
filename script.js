// CONFIGURAZIONE
const apiKey = "29c8f4131ebc58d89d3594f4db6fdb97";
const IP_PI = "raspberrypi.local";
const SERVER_URL = `http://raspberrypi.local:5000/tasks`;
const ROUTINE_URL = `http://raspberrypi.local:5000/routine`;
const HABITS_URL = `http://raspberrypi.local:5000/habits`;

let habitDataStore = []; 
let currentViewDate = new Date();

// Stato locale per evitare aggiornamenti inutili del DOM
let lastTasksJSON = "";

// 1. OROLOGIO E DATA
function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('digital-clock');
    const dateEl = document.getElementById('date-display');
    
    if(clockEl) clockEl.innerText = now.toLocaleTimeString('it-IT', {hour12: false});
    
    if(dateEl) {
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        dateEl.innerText = `${day}. ${month}. ${year}`;
    }

    checkScheduleReset(); 
}

// 2. METEO
async function checkWeather(city) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?units=metric&q=${city}&appid=${apiKey}&lang=it`);
        const data = await response.json();
        if(response.ok) {
            document.querySelector("#city").innerText = data.name.toUpperCase();
            document.querySelector("#temp").innerText = Math.round(data.main.temp) + "°C";
            document.querySelector("#description").innerText = data.weather[0].description.toUpperCase();
        }
    } catch (e) { console.error("Meteo Error", e); }
}

// 3. TASK MANAGER
async function loadTasksFromServer() {
    try {
        const response = await fetch(SERVER_URL);
        const tasks = await response.json();
        const currentJSON = JSON.stringify(tasks);

        // Aggiorna il DOM solo se i dati sono effettivamente cambiati
        if (currentJSON !== lastTasksJSON) {
            const taskList = document.getElementById('task-list');
            taskList.innerHTML = "";
            tasks.forEach(taskText => renderTask(taskText));
            lastTasksJSON = currentJSON;
        }
    } catch (e) { console.warn("Server non raggiungibile per Task"); }
}

async function saveTasksToServer() {
    const taskElements = document.querySelectorAll("#task-list li span.text-content");
    const tasks = Array.from(taskElements).map(el => el.innerText.replace("> ", ""));
    lastTasksJSON = JSON.stringify(tasks); // Evita l'auto-refresh immediato

    try {
        await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: lastTasksJSON
        });
    } catch (e) { console.error("Errore salvataggio task", e); }
}

function renderTask(text) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="text-content">> ${text.toUpperCase()}</span> <span class="del" style="cursor:pointer; color:red; margin-left:10px;">[X]</span>`;
    li.querySelector(".del").onclick = () => {
        li.remove();
        saveTasksToServer();
    };
    document.getElementById('task-list').appendChild(li);
}

function addTask() {
    const input = document.getElementById('task-input');
    const text = input.value.trim();
    if (text === "") return;
    renderTask(text);
    saveTasksToServer();
    input.value = "";
}

// 4. ROUTINE MANAGER (Sincronizzazione)
async function saveRoutineToServer() {
    const checkboxes = document.querySelectorAll('.routine-container input[type="checkbox"]');
    const routineState = Array.from(checkboxes).map(cb => ({ id: cb.id, checked: cb.checked }));
    
    try {
        await fetch(ROUTINE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(routineState)
        });
    } catch (e) { console.error("Errore salvataggio routine", e); }
}

async function loadRoutineFromServer() {
    try {
        const response = await fetch(ROUTINE_URL);
        const routineState = await response.json();
        routineState.forEach(item => {
            const cb = document.getElementById(item.id);
            // Aggiorna solo se lo stato è diverso per non interrompere l'interazione utente
            if (cb && cb.checked !== item.checked) cb.checked = item.checked;
        });
    } catch (e) { console.warn("Server non raggiungibile per Routine"); }
}

// 5. CITAZIONE
async function getQuote() {
    try {
        const response = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://favqs.com/api/qotd'));
        const data = await response.json();
        const content = JSON.parse(data.contents);
        document.getElementById('quote-text').innerText = `"${content.quote.body}"`;
        document.getElementById('quote-author').innerText = `-- ${content.quote.author}`;
    } catch (e) {
        document.getElementById('quote-text').innerText = '"COGNITIO POTESTAS EST"';
    }
}

// 6. LOGICA UI
function highlightToday() {
    const giorni = ["Domenica", "Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi", "Sabato"];
    const oggi = giorni[new Date().getDay()].toUpperCase();
    document.querySelectorAll("th").forEach(th => {
        th.classList.toggle("today-highlight", th.innerText.trim().toUpperCase() === oggi);
    });
}

function workoutTable() {
    const table = document.getElementById("workoutTable");
    const option = document.getElementById("workoutOption");
    if(table && option) {
        table.style.display = option.checked ? "none" : "table"; 
    }
}

// 7. SINCRONIZZAZIONE GLOBALE
async function syncTasks() {
    await loadTasksFromServer();
}

async function syncRoutines(){
   await loadRoutineFromServer();
}

//8. RESET GIORNALIERO (Ore 04:00)
let alreadyResetToday = false;
function resetDailyOptions() {
    document.querySelectorAll('.routine-container input[type="checkbox"]').forEach(cb => cb.checked = false);
    saveRoutineToServer();
}

function checkScheduleReset() {
    const now = new Date();
    if (now.getHours() === 4 && now.getMinutes() === 0) {
        if (!alreadyResetToday) {
            resetDailyOptions();
            alreadyResetToday = true;
        }
    } else {
        alreadyResetToday = false;
    }
}

async function loadHabits() {
    try {
        const response = await fetch(HABITS_URL);
        const data = await response.json();
        habitDataStore = Array.isArray(data) ? data : [];
        renderHabitGrid();
    } catch (e) {
        console.warn("Server non raggiungibile per Habits");
        habitDataStore = [];
        renderHabitGrid();
    }
}

// --- FUNZIONE SALVATAGGIO ABITUDINI ---
async function saveHabit() {
    const dateInput = document.getElementById('habit-date');
    const svegliaInput = document.getElementById('habit-sveglia');
    const workoutInput = document.getElementById('habit-allenamento');

    if (!dateInput.value) return alert("DATA_MISSING");

    const date = dateInput.value;
    const sveglia = svegliaInput.value;
    const workout = workoutInput.checked;
    
    let score = 0;
    const oraSveglia = parseInt(sveglia.split(':')[0]);
    if (oraSveglia <= 6) score += 2;
    if (workout) score += 2;
    
    // LOGICA PER LISTA []:
    // Cerchiamo se esiste già un record per questa data
    const existingIndex = habitDataStore.findIndex(entry => entry.date === date);

    if (existingIndex !== -1) {
        // Se esiste, aggiorna lo score
        habitDataStore[existingIndex].score = score;
    } else {
        // Altrimenti aggiungi un nuovo oggetto alla lista
        habitDataStore.push({ date: date, score: score });
    }

    try {
        await fetch(HABITS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(habitDataStore)
        });
        renderHabitGrid();
    } catch (e) {
        console.error("Errore salvataggio", e);
        renderHabitGrid();
    }
}

// --- FUNZIONE CARICAMENTO (Corretta) ---
function renderHabitGrid() {
    const grid = document.getElementById('habit-grid');
    const label = document.getElementById('month-label');
    if (!grid || !label) return;

    grid.innerHTML = '';
    const y = currentViewDate.getFullYear();
    const m = currentViewDate.getMonth();

    const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(currentViewDate);
    label.innerText = monthName.toUpperCase();

    const firstDay = new Date(y, m, 1).getDay();
    const offset = (firstDay === 0) ? 6 : firstDay - 1;

    for (let i = 0; i < offset; i++) {
        grid.appendChild(document.createElement('div'));
    }

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = 'habit-cell';
        cell.innerText = d;
        
        // RICERCA NELLA LISTA []:
        const record = habitDataStore.find(entry => entry.date === dateKey);
        if (record && record.score) {
            cell.classList.add(`h-lvl-${record.score}`);
        }
        grid.appendChild(cell);
    }
}

// --- CORREZIONE RENDERING HEATMAP ---
function renderHabitGrid() {
    const grid = document.getElementById('habit-grid');
    const label = document.getElementById('month-label');
    if (!grid || !label) return;

    grid.innerHTML = '';
    const y = currentViewDate.getFullYear();
    const m = currentViewDate.getMonth();

    const monthName = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(currentViewDate);
    label.innerText = monthName.toUpperCase();

    const firstDay = new Date(y, m, 1).getDay();
    const offset = (firstDay === 0) ? 6 : firstDay - 1;

    for (let i = 0; i < offset; i++) {
        grid.appendChild(document.createElement('div'));
    }

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = 'habit-cell';
        cell.innerText = d;
        
        // RICERCA NELLA LISTA []:
        const record = habitDataStore.find(entry => entry.date === dateKey);
        if (record && record.score) {
            cell.classList.add(`h-lvl-${record.score}`);
        }
        grid.appendChild(cell);
    }
}

// --- CORREZIONE SYNC HABITS ---
async function syncHabits() {
    await loadHabits();
}

// 9. INIZIALIZZAZIONE
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-habit-btn');
    if(saveBtn) saveBtn.onclick = saveHabit;

    const prevBtn = document.getElementById('prev-month');
    if(prevBtn) prevBtn.onclick = () => { 
        currentViewDate.setMonth(currentViewDate.getMonth() - 1); 
        renderHabitGrid(); 
    };

    const nextBtn = document.getElementById('next-month');
    if(nextBtn) nextBtn.onclick = () => { 
        currentViewDate.setMonth(currentViewDate.getMonth() + 1); 
        renderHabitGrid(); 
    };

    // Input meteo
    const cityInput = document.getElementById('city-input');
    if(cityInput) {
        cityInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') checkWeather(e.target.value);
        });
    }

    // Bottone task
    const addTaskBtn = document.getElementById('add-task');
    if(addTaskBtn) addTaskBtn.onclick = addTask;

    // Delegazione eventi per checkbox routine (più efficiente)
    document.querySelector('.routine-container')?.addEventListener('change', (e) => {
        if(e.target.type === 'checkbox') {
            saveRoutineToServer();
            // Se è il checkbox che nasconde la tabella, attiva la funzione
            if(e.target.id === 'workoutOption') workoutTable();
        }
    });   

    // Avvio cicli
    setInterval(updateClock, 1000);
    setInterval(syncTasks, 5000); 
    setInterval(syncRoutines, 5000);
    setInterval(syncHabits, 10000)
    setInterval(highlightToday, 60000);

    // Primo caricamento
    updateClock();
    checkWeather("Rocca De Baldi");
    getQuote();
    highlightToday();
    
    // Sostituito syncDashboard con le chiamate corrette
    loadTasksFromServer();
    loadRoutineFromServer();
    loadHabits(); 
});
