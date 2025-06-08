// WebSocket connection
let ws = null;
let reconnectInterval = null;
let currentFilter = 'all';

// DOM elements
const workersContainer = document.getElementById('workers');
const tasksContainer = document.getElementById('tasks');
const connectionIndicator = document.getElementById('connection-indicator');
const connectionText = document.getElementById('connection-text');
const addTaskForm = document.getElementById('add-task-form');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    setupEventListeners();
    fetchInitialData();
});

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3335');
    
    ws.onopen = () => {
        console.log('Connected to WebSocket');
        connectionIndicator.className = 'connected';
        connectionText.textContent = 'Connected';
        
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data);
        
        if (data.type === 'initial' || data.type === 'update') {
            updateWorkers(data.workers);
            updateTasks(data.tasks);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('Disconnected from WebSocket');
        connectionIndicator.className = 'disconnected';
        connectionText.textContent = 'Disconnected';
        
        // Attempt to reconnect every 5 seconds
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                console.log('Attempting to reconnect...');
                connectWebSocket();
            }, 5000);
        }
    };
}

function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            filterTasks();
        });
    });
    
    // Add task form
    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const taskData = {
            id: document.getElementById('task-id').value,
            description: document.getElementById('task-description').value,
            dependencies: document.getElementById('task-dependencies').value
                .split(',')
                .map(d => d.trim())
                .filter(d => d),
            output: document.getElementById('task-output').value
        };
        
        try {
            const response = await fetch('http://localhost:3335/api/add-task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
            
            if (response.ok) {
                addTaskForm.reset();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error adding task:', error);
            alert('Failed to add task');
        }
    });
}

async function fetchInitialData() {
    try {
        const [workersResponse, tasksResponse] = await Promise.all([
            fetch('http://localhost:3335/api/workers'),
            fetch('http://localhost:3335/api/all-tasks')
        ]);
        
        const workersData = await workersResponse.json();
        const tasksData = await tasksResponse.json();
        
        updateWorkers(workersData.workers || []);
        updateTasks(tasksData.tasks || []);
    } catch (error) {
        console.error('Error fetching initial data:', error);
    }
}

function updateWorkers(workers) {
    workersContainer.innerHTML = '';
    
    workers.forEach((worker) => {
        const workerDiv = document.createElement('div');
        workerDiv.className = `worker-slot ${!worker.active ? 'available' : 'occupied'}`;
        
        let content = `
            <h3>Worker ${worker.slot}</h3>
            <div class="status">${!worker.active ? 'Available' : 'Occupied'}</div>
        `;
        
        if (worker.active && worker.workerId) {
            content += `<div class="task-info">ID: ${worker.workerId}</div>`;
        }
        
        workerDiv.innerHTML = content;
        workersContainer.appendChild(workerDiv);
    });
}

function updateTasks(tasks) {
    tasksContainer.innerHTML = '';
    
    tasks.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-card ${task.status}`;
        taskDiv.dataset.status = task.status;
        
        let content = `
            <span class="status-badge ${task.status}">${task.status.replace('_', ' ')}</span>
            <h4>${task.id}</h4>
            <div class="description">${task.description}</div>
            <div class="meta">
        `;
        
        if (task.dependencies && task.dependencies.length > 0) {
            content += `<div>Dependencies: ${task.dependencies.join(', ')}</div>`;
        }
        
        if (task.workerId) {
            content += `<div>Worker: ${task.workerId}</div>`;
        }
        
        if (task.output) {
            content += `<div>Output: ${task.output}</div>`;
        }
        
        if (task.error) {
            content += `<div style="color: #dc3545;">Error: ${task.error}</div>`;
        }
        
        content += '</div>';
        
        taskDiv.innerHTML = content;
        tasksContainer.appendChild(taskDiv);
    });
    
    filterTasks();
}

function filterTasks() {
    const taskCards = document.querySelectorAll('.task-card');
    
    taskCards.forEach(card => {
        if (currentFilter === 'all' || card.dataset.status === currentFilter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}