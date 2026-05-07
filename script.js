document.addEventListener('DOMContentLoaded', () => {
    // REFERÊNCIAS E LÓGICA DO ACESSO À ANÁLISE
    const loginModal = document.getElementById('login-modal');
    const calculatorContent = document.getElementById('calculator-content');
    const responsibleInput = document.getElementById('responsibleInput');
    const accessBtn = document.getElementById('accessBtn');
    const accessMessage = document.getElementById('accessMessage');
    
    let responsibleName = '';

    loginModal.style.display = 'flex';
    calculatorContent.style.display = 'none';

    accessBtn.addEventListener('click', () => {
        const responsible = responsibleInput.value.trim();
        if (responsible === '') {
            accessMessage.textContent = 'Por favor, insira o nome do responsável.';
            accessMessage.style.color = 'red';
        } else {
            responsibleName = responsible;
            accessMessage.textContent = 'Acesso liberado!';
            accessMessage.style.color = 'green';
            setTimeout(showCalculator, 1500);
        }
    });

    function showCalculator() {
        loginModal.style.display = 'none';
        calculatorContent.style.display = 'flex';
        updateDateTime();
        setInterval(updateDateTime, 1000);
        loadInitialSettings();
        renderAllWells();
        updateExtractedColorPreview();
    }
    
    // Referências a elementos do DOM
    const imageUpload = document.getElementById('imageUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');
    const canvasContainer = document.querySelector('.canvas-container');
    const addWellBtn = document.getElementById('addWellBtn');
    const clearWellsBtn = document.getElementById('clearWellsBtn');
    const extractedColorPreview = document.getElementById('extractedColorPreview');
    const extractedRDisplay = document.getElementById('extractedR');
    const extractedGDisplay = document.getElementById('extractedG');
    const extractedBDisplay = document.getElementById('extractedB');
    const wellsResultsContainer = document.getElementById('wellsResultsContainer');
    const noWellsMessage = document.getElementById('noWellsMessage');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const averageFcResultSpan = document.getElementById('averageFcResult');
    const averageReductionResultSpan = document.getElementById('averageReductionResult');
    const averageReductionLabel = document.getElementById('averageReductionLabel');
    const fcFormulaInput = document.getElementById('fcFormulaInput');
    const currentFcFormulaDisplay = document.querySelector('.current-fc-formula-display');
    const reductionVariableNameInput = document.getElementById('reductionVariableNameInput');
    const currentReductionVariableNameDisplay = document.querySelector('.current-reduction-variable-name-display');
    const currentDateTimeDisplay = document.getElementById('currentDateTime');
    const sampleSizeInput = document.getElementById('sampleSizeInput'); 
    const methodSelect = document.getElementById('methodSelect');
    const wellNameInput = document.getElementById('wellNameInput');
    const addCalibrationBtn = document.getElementById('addCalibrationBtn');
    const newMethodNameInput = document.getElementById('newMethodNameInput');
    const newReductionFormulaInput = document.getElementById('newReductionFormulaInput');
    const calibrationTableContainer = document.getElementById('calibrationTableContainer');

    let currentFcFormula;
    let currentReductionVariableName;
    let currentImage = null;
    let calibrationData = JSON.parse(localStorage.getItem('calibrationData')) || [];
    let lastExtractedR = 0;
    let lastExtractedG = 0;
    let lastExtractedB = 0;
    let lastClickPosition = null;
    let zoomLevel = 1.0;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let initialImageDrawX = 0;
    let initialImageDrawY = 0;
    let initialImageDrawWidth = 0;
    let initialImageDrawHeight = 0;
    let selectedWells = JSON.parse(localStorage.getItem('selectedWells')) || [];
    let offscreenCanvas = document.createElement('canvas');
    let offscreenCtx = offscreenCanvas.getContext('2d');

    // --- VARIÁVEIS PARA TOUCH NO CELULAR ---
    let initialDist = null;
    let isTouching = false;

    function updateDateTime() {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR');
        const formattedTime = now.toLocaleTimeString('pt-BR');
        currentDateTimeDisplay.textContent = `Data: ${formattedDate} | Hora: ${formattedTime}`;
    }

    function rgbToHex(r, g, b) {
        const toHex = (c) => {
            const hex = Math.round(c).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function updateFormulasAndVariables() {
        const fcFormulaStr = fcFormulaInput.value.trim();
        if (!fcFormulaStr) { return false; }
        currentFcFormula = fcFormulaStr;
        localStorage.setItem('fcCalculationFormula', currentFcFormula);
        currentFcFormulaDisplay.textContent = `Fórmula FC Atual: ${currentFcFormula}`;
        
        const reductionVarNameStr = reductionVariableNameInput.value.trim();
        currentReductionVariableName = reductionVarNameStr || '% Redução';
        localStorage.setItem('reductionVariableName', currentReductionVariableName);
        averageReductionLabel.textContent = `Média ${currentReductionVariableName} dos Poços:`;
        return true;
    }

    function loadInitialSettings() {
        const savedFcFormula = localStorage.getItem('fcCalculationFormula') || '(R+G+B)/R';
        fcFormulaInput.value = savedFcFormula;

        const savedReductionVariableName = localStorage.getItem('reductionVariableName') || '% Redução';
        reductionVariableNameInput.value = savedReductionVariableName;
        
        updateFormulasAndVariables();
        renderCalibrationTable();
        populateMethodSelect();
        renderAllWells();
        calculateAverage();
    }

    function redrawCanvas() {
        if (!currentImage) {
            ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
            return;
        }

        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        ctx.save();
        ctx.translate(initialImageDrawX + panX, initialImageDrawY + panY);
        ctx.scale(zoomLevel, zoomLevel);

        ctx.drawImage(currentImage, 0, 0, currentImage.width, currentImage.height, 0, 0, initialImageDrawWidth, initialImageDrawHeight);
        
        selectedWells.forEach(well => {
            if (well.clickPosition && well.sampleSize) {
                const sizeInInitialCanvas = well.sampleSize * (initialImageDrawWidth / currentImage.width);
                const rectX = well.clickPosition.x * (initialImageDrawWidth / currentImage.width) - sizeInInitialCanvas / 2;
                const rectY = well.clickPosition.y * (initialImageDrawHeight / currentImage.height) - sizeInInitialCanvas / 2;
                ctx.strokeStyle = 'blue';
                ctx.lineWidth = 2 / zoomLevel;
                ctx.strokeRect(rectX, rectY, sizeInInitialCanvas, sizeInInitialCanvas);
            }
        });

        if (lastClickPosition) {
            const selectedSize = parseInt(sampleSizeInput.value, 10);
            const sizeInInitialCanvas = selectedSize * (initialImageDrawWidth / currentImage.width);
            const rectX = lastClickPosition.x * (initialImageDrawWidth / currentImage.width) - sizeInInitialCanvas / 2;
            const rectY = lastClickPosition.y * (initialImageDrawHeight / currentImage.height) - sizeInInitialCanvas / 2;
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2 / zoomLevel;
            ctx.strokeRect(rectX, rectY, sizeInInitialCanvas, sizeInInitialCanvas);
        }
        ctx.restore();
    }

    // --- EVENTOS DE TOQUE (MOBILE ZOOM & PAN) ---
    imageCanvas.addEventListener('touchstart', (e) => {
        isTouching = true;
        if (e.touches.length === 1) {
            startMouseX = e.touches[0].clientX;
            startMouseY = e.touches[0].clientY;
            startPanX = panX;
            startPanY = panY;
        } else if (e.touches.length === 2) {
            initialDist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
        }
    }, { passive: false });

    imageCanvas.addEventListener('touchmove', (e) => {
        if (!isTouching) return;
        e.preventDefault();

        if (e.touches.length === 1) {
            // Arrastar com um dedo (apenas se houver zoom)
            const dx = e.touches[0].clientX - startMouseX;
            const dy = e.touches[0].clientY - startMouseY;
            panX = startPanX + dx;
            panY = startPanY + dy;
        } else if (e.touches.length === 2) {
            // Zoom com dois dedos (pinça)
            let dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            let delta = dist / initialDist;
            zoomLevel *= delta;
            if (zoomLevel < 1.0) zoomLevel = 1.0;
            if (zoomLevel > 10.0) zoomLevel = 10.0;
            initialDist = dist;
        }
        redrawCanvas();
    }, { passive: false });

    imageCanvas.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            isTouching = false;
            initialDist = null;
        }
    });

    // --- EVENTOS DE MOUSE (DESKTOP) ---
    imageCanvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            isPanning = true;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            startPanX = panX;
            startPanY = panY;
            imageCanvas.style.cursor = 'grabbing';
        }
    });

    imageCanvas.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;
            panX = startPanX + dx;
            panY = startPanY + dy;
            redrawCanvas();
        }
    });

    imageCanvas.addEventListener('mouseup', () => {
        isPanning = false;
        imageCanvas.style.cursor = 'grab';
    });

    imageCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const oldZoomLevel = zoomLevel;
        if (e.deltaY < 0) zoomLevel *= 1.1;
        else zoomLevel /= 1.1;
        if (zoomLevel < 1.0) zoomLevel = 1.0;
        if (zoomLevel > 10.0) zoomLevel = 10.0;
        redrawCanvas();
    }, { passive: false });

    // --- CLIQUE PARA EXTRAIR COR ---
    imageCanvas.addEventListener('click', (e) => {
        // Se estiver arrastando ou usando dois dedos, não extrai cor
        if (Math.abs(panX - startPanX) > 5 || Math.abs(panY - startPanY) > 5) return;
        if (!currentImage) return;

        const rect = imageCanvas.getBoundingClientRect();
        const clickXInCanvas = (e.clientX - rect.left - initialImageDrawX - panX) / zoomLevel;
        const clickYInCanvas = (e.clientY - rect.top - initialImageDrawY - panY) / zoomLevel;

        const scaleX = currentImage.width / initialImageDrawWidth;
        const scaleY = currentImage.height / initialImageDrawHeight;
        const imgX = clickXInCanvas * scaleX;
        const imgY = clickYInCanvas * scaleY;

        const selectedSize = parseInt(sampleSizeInput.value, 10);
        const halfSize = Math.floor(selectedSize / 2);
        let tR = 0, tG = 0, tB = 0, count = 0;

        for (let y = -halfSize; y <= halfSize; y++) {
            for (let x = -halfSize; x <= halfSize; x++) {
                const px = Math.round(imgX + x), py = Math.round(imgY + y);
                if (px >= 0 && px < currentImage.width && py >= 0 && py < currentImage.height) {
                    const data = offscreenCtx.getImageData(px, py, 1, 1).data;
                    tR += data[0]; tG += data[1]; tB += data[2];
                    count++;
                }
            }
        }
        if (count > 0) {
            lastExtractedR = Math.round(tR / count);
            lastExtractedG = Math.round(tG / count);
            lastExtractedB = Math.round(tB / count);
            lastClickPosition = { x: imgX, y: imgY };
            updateExtractedColorPreview();
            redrawCanvas();
        }
    });

    // --- CARREGAMENTO DE IMAGEM ---
    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    currentImage = img;
                    offscreenCanvas.width = img.width;
                    offscreenCanvas.height = img.height;
                    offscreenCtx.drawImage(img, 0, 0);
                    imageCanvas.width = canvasContainer.clientWidth;
                    imageCanvas.height = canvasContainer.clientHeight;
                    
                    const imgRatio = img.width / img.height;
                    const canRatio = imageCanvas.width / imageCanvas.height;
                    if (imgRatio > canRatio) {
                        initialImageDrawWidth = imageCanvas.width;
                        initialImageDrawHeight = imageCanvas.width / imgRatio;
                    } else {
                        initialImageDrawHeight = imageCanvas.height;
                        initialImageDrawWidth = imageCanvas.height * imgRatio;
                    }
                    initialImageDrawX = (imageCanvas.width - initialImageDrawWidth) / 2;
                    initialImageDrawY = (imageCanvas.height - initialImageDrawHeight) / 2;
                    zoomLevel = 1.0; panX = 0; panY = 0;
                    redrawCanvas();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Funções auxiliares (Renderização de tabelas, CSV, etc.)
    function calculateFcValue(R, G, B, formula) {
        try {
            const scope = { R, G, B };
            const fn = new Function('scope', `with(scope) { return ${formula}; }`);
            const res = fn(scope);
            return isFinite(res) ? res : null;
        } catch (e) { return null; }
    }

    function renderAllWells() {
        wellsResultsContainer.innerHTML = '';
        if (selectedWells.length === 0) {
            noWellsMessage.style.display = 'block';
            return;
        }
        noWellsMessage.style.display = 'none';
        selectedWells.forEach((well, index) => {
            const fc = calculateFcValue(well.R, well.G, well.B, currentFcFormula);
            const card = document.createElement('div');
            card.className = 'well-card';
            card.innerHTML = `
                <h3>${well.wellName} <button class="close-btn" data-index="${index}">×</button></h3>
                <p>RGB: ${well.R}, ${well.G}, ${well.B} | FC: ${fc ? fc.toFixed(4) : 'Err'}</p>
            `;
            wellsResultsContainer.appendChild(card);
        });
    }

    function addWell() {
        if (!currentImage || !lastClickPosition) return;
        const wellData = {
            wellName: wellNameInput.value || `Poço ${selectedWells.length + 1}`,
            R: lastExtractedR, G: lastExtractedG, B: lastExtractedB,
            sampleSize: parseInt(sampleSizeInput.value, 10),
            methodName: methodSelect.value,
            timestamp: new Date().toISOString(),
            clickPosition: lastClickPosition
        };
        selectedWells.push(wellData);
        localStorage.setItem('selectedWells', JSON.stringify(selectedWells));
        renderAllWells();
        calculateAverage();
    }

    function updateExtractedColorPreview() {
        extractedColorPreview.style.backgroundColor = `rgb(${lastExtractedR},${lastExtractedG},${lastExtractedB})`;
        extractedRDisplay.textContent = lastExtractedR;
        extractedGDisplay.textContent = lastExtractedG;
        extractedBDisplay.textContent = lastExtractedB;
    }

    function calculateAverage() {
        // Lógica de média simplificada
        const fcs = selectedWells.map(w => calculateFcValue(w.R, w.G, w.B, currentFcFormula)).filter(v => v !== null);
        const avg = fcs.length ? fcs.reduce((a, b) => a + b, 0) / fcs.length : 0;
        averageFcResultSpan.textContent = avg.toFixed(4);
    }

    // Eventos finais
    addWellBtn.addEventListener('click', addWell);
    clearWellsBtn.addEventListener('click', () => { selectedWells = []; renderAllWells(); redrawCanvas(); });
    loadInitialSettings();
});