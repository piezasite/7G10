let mediaRecorder;
let recordedChunks = [];
let timerInterval;

async function toggleRecord() {
    const btn = document.getElementById('rec-btn');
    const timerDisplay = document.getElementById('timer');
    const previewWrap = document.getElementById('preview-wrap');
    const videoPreview = document.getElementById('cam-preview');

    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "user" }, 
                audio: true 
            });
            
            videoPreview.srcObject = stream;
            previewWrap.style.display = 'block';
            timerDisplay.style.display = 'block';
            btn.classList.add('active');
            
            // IMPORTANTE: Limpiar chunks antes de empezar
            recordedChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) recordedChunks.push(e.data);
            };

            // Evento al detenerse
            mediaRecorder.onstop = () => {
                // Pequeño delay para asegurar que el stream se cierre bien
                setTimeout(() => processAndUpload(stream), 500);
            };

            mediaRecorder.start();
            let countdown = 20;
            timerDisplay.innerText = countdown;

            timerInterval = setInterval(() => {
                countdown--;
                timerDisplay.innerText = countdown;
                if (countdown <= 0) {
                    if(mediaRecorder.state === "recording") toggleRecord();
                }
            }, 1000);

        } catch (err) {
            alert("Error: Cámara no disponible.");
        }
    } else {
        // Detener manualmente
        mediaRecorder.stop();
        btn.classList.remove('active');
        clearInterval(timerInterval);
        timerDisplay.style.display = 'none';
        previewWrap.style.display = 'none';
    }
}

function processAndUpload(stream) {
    // Detenemos los tracks de la cámara
    stream.getTracks().forEach(track => track.stop());

    if (recordedChunks.length === 0) {
        console.error("No hay datos grabados");
        return;
    }

    const blob = new Blob(recordedChunks, { type: 'video/mp4' });
    const fd = new FormData();
    fd.append('video', blob, 'nodo.mp4');

    const xhr = new XMLHttpRequest();
    const bar = document.getElementById('progress-bar');
    const container = document.getElementById('progress-container');

    // MOSTRAR BARRA
    container.style.display = 'block';
    bar.style.width = '0%';

    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            bar.style.width = percent + '%';
            console.log("Subiendo: " + percent + "%");
        }
    };

    xhr.onload = () => {
        console.log("Respuesta servidor:", xhr.responseText);
        container.style.display = 'none';
        loadNodes(); // Refrescar esferas
    };

    xhr.onerror = () => {
        alert("Error de red al subir.");
        container.style.display = 'none';
    };

    xhr.open('POST', 'api.php?action=upload');
    xhr.send(fd);
}

async function loadNodes() {
    try {
        const res = await fetch('api.php?action=fetch');
        const data = await res.json();
        
        // Si el backend mandó un error, lo mostramos y detenemos aquí
        if (data.error) {
            console.error("Error del servidor:", data.error);
            return; 
        }

        const nodes = data; // Si no hay error, data es el array de nodos
        const canvas = document.getElementById('canvas');
        const currentSpheres = Array.from(document.querySelectorAll('.node-sphere'));
        const serverIds = nodes.map(n => `node-${n.id}`);

        // Eliminar antiguos
        currentSpheres.forEach(sphere => {
            if (!serverIds.includes(sphere.id)) {
                sphere.style.opacity = '0';
                setTimeout(() => sphere.remove(), 500);
            }
        });

        // Agregar nuevos
        nodes.forEach(node => {
            const nodeId = `node-${node.id}`;
            if (!document.getElementById(nodeId)) {
                const div = document.createElement('div');
                div.className = 'node-sphere';
                div.id = nodeId;
                div.style.left = Math.random() * (window.innerWidth - 100) + 'px';
                div.style.top = Math.random() * (window.innerHeight - 150) + 'px';
                div.innerHTML = `<video src="${node.media_url}" autoplay loop muted playsinline></video>`;
                div.onclick = () => {
                    const v = div.querySelector('video');
                    v.muted = !v.muted;
                    div.style.transform = v.muted ? 'scale(1)' : 'scale(2.5)';
                    div.style.zIndex = v.muted ? '10' : '5000';
                };
                canvas.appendChild(div);
                setTimeout(() => div.style.opacity = '1', 50);
            }
        });
    } catch (e) {
        console.error("Fallo al parsear JSON o error de red:", e);
    }
}

// Carga inicial
window.onload = loadNodes;
// Refresco automático de la red cada 30 segundos
setInterval(loadNodes, 30000);