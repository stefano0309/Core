// CONFIGURAZIONE
const apiKey = "29c8f4131ebc58d89d3594f4db6fdb97";
const IP_PI = "192.168.1.234";
const SERVER_URL = `http://${IP_PI}:5000/tasks`;
const ROUTINE_URL = `http://${IP_PI}:5000/routine`;

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

// 9. INIZIALIZZAZIONE
document.addEventListener('DOMContentLoaded', () => {
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
    setInterval(highlightToday, 60000); // Inutile farlo ogni secondo, basta ogni minuto

    // Primo caricamento
    updateClock();
    checkWeather("Rocca De Baldi");
    getQuote();
    highlightToday();
    syncDashboard();
});
