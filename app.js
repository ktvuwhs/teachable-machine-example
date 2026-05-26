// --- Teachable Machine Global Variables ---
let model, webcam, labelContainer, maxPredictions;
let isPredicting = false; 

// --- Game Engine Global Variables ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameRunning = false;
let score = 0;
let frames = 0;
let obstacles = [];

// Dino Physics Engine Map
let dino = {
    x: 50,
    y: 110,
    w: 20,
    h: 40,
    dy: 0,
    jumpPower: 10,
    gravity: 0.6,
    grounded: true
};

// ---------------------------------------------------------
// 1. TEACHABLE MACHINE CORE LOGIC
// ---------------------------------------------------------
async function init() {
    const fileInput = document.getElementById('zip-selector');
    const zipFile = fileInput.files[0];

    if (!zipFile) {
        alert("Please upload a valid model .zip file first.");
        return;
    }

    try {
        const zip = await JSZip.loadAsync(zipFile);
        let modelJsonEntry, weightsBinEntry, metadataJsonEntry;

        zip.forEach((relativePath, fileEntry) => {
            if (relativePath.endsWith("model.json")) modelJsonEntry = fileEntry;
            if (relativePath.endsWith("weights.bin")) weightsBinEntry = fileEntry;
            if (relativePath.endsWith("metadata.json")) metadataJsonEntry = fileEntry;
        });

        if (!modelJsonEntry || !weightsBinEntry || !metadataJsonEntry) {
            alert("Error: The uploaded zip archive is missing required files (model.json, weights.bin, or metadata.json).");
            return;
        }

        const modelJsonBlob = await modelJsonEntry.async("blob");
        const weightsBinBlob = await weightsBinEntry.async("blob");
        const metadataJsonBlob = await metadataJsonEntry.async("blob");

        const modelFile = new File([modelJsonBlob], "model.json", { type: "application/json" });
        const weightsFile = new File([weightsBinBlob], "weights.bin", { type: "application/octet-stream" });
        const metadataFile = new File([metadataJsonBlob], "metadata.json", { type: "application/json" });

        model = await tmImage.loadFromFiles(modelFile, weightsFile, metadataFile);
        maxPredictions = model.getTotalClasses();

    } catch (error) {
        console.error(error);
        alert("Failed to read files from the archive. Make sure the zip is uncorrupted.");
        return;
    }

    // Camera Frame Setup
    const flip = true; 
    webcam = new tmImage.Webcam(200, 200, flip); 
    await webcam.setup(); 
    await webcam.play();
    
    isPredicting = true; 
    window.requestAnimationFrame(loop);

    // Reset and Initialize Dynamic UI Bars
    document.getElementById("webcam-container").innerHTML = "";
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    document.getElementById("webcam-container").appendChild(webcam.canvas);
    
    for (let i = 0; i < maxPredictions; i++) { 
        const rowDiv = document.createElement("div");
        rowDiv.className = "mb-3";

        const labelHeader = document.createElement("div");
        labelHeader.className = "d-flex justify-content-between mb-1 small fw-bold text-secondary";
        
        const nameSpan = document.createElement("span");
        nameSpan.className = "class-name";
        
        const percentSpan = document.createElement("span");
        percentSpan.className = "class-percent";

        labelHeader.appendChild(nameSpan);
        labelHeader.appendChild(percentSpan);

        const progressContainer = document.createElement("div");
        progressContainer.className = "progress";
        progressContainer.style.height = "14px";

        const progressBar = document.createElement("div");
        progressBar.className = "progress-bar class-bar-fill";
        progressBar.style.backgroundColor = "#bf1e2e"; // School Red fill
        progressBar.style.width = "0%";
        progressBar.style.transition = "width 0.1s ease-out"; 

        progressContainer.appendChild(progressBar);
        rowDiv.appendChild(labelHeader);
        rowDiv.appendChild(progressContainer);
        
        labelContainer.appendChild(rowDiv);
    }

    // Automatically trigger the game engine loop once resources run smoothly
    if (!gameRunning) {
        restartGame();
    }
}

async function loop() {
    if (isPredicting) {
        webcam.update(); 
        await predict();
        window.requestAnimationFrame(loop);
    }
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    
    for (let i = 0; i < maxPredictions; i++) {
        const rowDiv = labelContainer.childNodes[i];
        const nameSpan = rowDiv.querySelector(".class-name");
        const percentSpan = rowDiv.querySelector(".class-percent");
        const progressBar = rowDiv.querySelector(".class-bar-fill");
        
        const probability = prediction[i].probability;
        
        nameSpan.innerHTML = prediction[i].className;
        percentSpan.innerHTML = (probability * 100).toFixed(0) + "%";
        progressBar.style.width = (probability * 100) + "%";

        // Game trigger threshold parameter check
        if (i === 0 && probability > 0.50) {
            dinoJump();
        }
    }
}

async function stop() {
    isPredicting = false; 
    if (webcam) {
        await webcam.stop(); 
    }
    gameRunning = false; 
}

// ---------------------------------------------------------
// 2. DINOSAUR GAME PHYSICS FRAMEWORK
// ---------------------------------------------------------
function gameLoop() {
    if (!gameRunning) return;

    // Flush painting canvas framework coordinates
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply basic vertical gravitational acceleration formulas
    dino.dy += dino.gravity;
    dino.y += dino.dy;

    // Map collision parameters to the floor line bounding threshold
    if (dino.y + dino.h >= canvas.height - 10) {
        dino.y = canvas.height - dino.h - 10;
        dino.dy = 0;
        dino.grounded = true;
    }

    // Paint Character Avatar (WHS Red Block)
    ctx.fillStyle = '#bf1e2e';
    ctx.fillRect(dino.x, dino.y, dino.w, dino.h);

    // Track active frames loop metrics
    frames++;
    
    // Periodically spawn incoming threats matching random interval offsets
    if (frames % Math.floor(Math.random() * 50 + 70) === 0) {
        obstacles.push({
            x: canvas.width,
            y: canvas.height - 40,
            w: 20,
            h: 30,
            speed: 6
        });
    }

    // Manage obstacle object collection states
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= obs.speed;
        
        ctx.fillStyle = '#1a1a1a'; // School Dark Gray obstacles
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

        // Standard bounding-box intersection formula logic (AABB Collision)
        if (
            dino.x < obs.x + obs.w &&
            dino.x + dino.w > obs.x &&
            dino.y < obs.y + obs.h &&
            dino.y + dino.h > obs.y
        ) {
            gameOver();
        }
    }

    // Filter array memory blocks dynamically to wipe safe out-of-bounds metrics
    obstacles = obstacles.filter(obs => obs.x + obs.w > 0);

    // Append simple runtime scoring
    score++;
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Score: ' + Math.floor(score / 10), canvas.width - 100, 30);

    // Trace floor surface divider axis line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 10);
    ctx.lineTo(canvas.width, canvas.height - 10);
    ctx.stroke();

    requestAnimationFrame(gameLoop);
}

function dinoJump() {
    if (dino.grounded && gameRunning) {
        dino.dy = -dino.jumpPower;
        dino.grounded = false;
    }
}

function gameOver() {
    gameRunning = false;
    document.getElementById('gameOverScreen').classList.remove('d-none');
    document.getElementById('finalScore').innerText = Math.floor(score / 10);
}

function restartGame() {
    dino.y = 110;
    dino.dy = 0;
    obstacles = [];
    score = 0;
    frames = 0;
    
    document.getElementById('gameOverScreen').classList.add('d-none');
    gameRunning = true;
    gameLoop();
}

// ---------------------------------------------------------
// 3. SECURE DOM BUTTON EVENT LISTENERS
// ---------------------------------------------------------
document.getElementById('btn-start').addEventListener('click', init);
document.getElementById('btn-stop').addEventListener('click', stop);
document.getElementById('btn-restart').addEventListener('click', restartGame);