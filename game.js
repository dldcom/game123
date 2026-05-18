document.addEventListener('DOMContentLoaded', () => {
    // Canvas Background Particles
    initParticles();

    let currentStageIndex = StorageManager.loadProgress();
    let currentStage = null;
    let pipesData = [];
    let moves = 0;
    let selectedPipe = null;

    const boardEl = document.getElementById('grid-board');
    const overlayEl = document.getElementById('action-overlay');
    const stageDisplay = document.getElementById('stage-display');
    const movesDisplay = document.getElementById('moves-display');
    const checkBtn = document.getElementById('check-flow-btn');
    const resetBtn = document.getElementById('reset-btn');
    const nextBtn = document.getElementById('next-stage-btn');
    const clearModal = document.getElementById('clear-modal');
    const autoSolveBtn = document.getElementById('auto-solve-btn'); // 추가된 임시 정답 버튼

    // UI Buttons
    document.querySelector('.rotate-left').addEventListener('click', () => rotatePipe(-1));
    document.querySelector('.rotate-right').addEventListener('click', () => rotatePipe(1));
    document.querySelector('.flip').addEventListener('click', flipPipe);
    
    checkBtn.addEventListener('click', checkWaterFlow);
    resetBtn.addEventListener('click', () => loadStage(currentStageIndex));
    nextBtn.addEventListener('click', goToNextStage);
    autoSolveBtn.addEventListener('click', autoSolveStage); // 이벤트 연결
    
    // Background click to deselect
    document.querySelector('.game-container').addEventListener('click', (e) => {
        if (e.target.classList.contains('cell') && e.target.classList.contains('valid-move')) {
            // It's a move, handled by cell click
            return;
        }
        if (!e.target.closest('.pipe') && !e.target.closest('.action-overlay')) {
            deselectPipe();
        }
    });

    loadStage(currentStageIndex);

    function loadStage(index) {
        if (index >= stages.length) {
            alert("모든 스테이지를 클리어했습니다!");
            StorageManager.clearProgress();
            index = 0;
        }
        
        currentStageIndex = index;
        StorageManager.saveProgress(currentStageIndex);
        currentStage = JSON.parse(JSON.stringify(stages[currentStageIndex])); // Deep copy
        pipesData = currentStage.pipes;
        moves = 0;
        selectedPipe = null;
        
        updateMovesDisplay();
        stageDisplay.innerText = currentStageIndex + 1;
        clearModal.classList.add('hidden');
        overlayEl.classList.add('hidden');
        
        renderBoard();
        renderPipes();
        resetStars();
    }

    function renderBoard() {
        boardEl.innerHTML = '';
        boardEl.style.setProperty('--cols', currentStage.cols);
        boardEl.style.setProperty('--rows', currentStage.rows);
        
        for (let y = 0; y < currentStage.rows; y++) {
            for (let x = 0; x < currentStage.cols; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener('click', () => handleCellClick(x, y));
                boardEl.appendChild(cell);
            }
        }
    }

    function renderPipes() {
        // Remove old pipes
        document.querySelectorAll('.pipe').forEach(p => p.remove());
        
        pipesData.forEach(pipe => {
            if (!pipe.flipX) pipe.flipX = 1;
            if (!pipe.flipY) pipe.flipY = 1;
            if (!pipe.rot) pipe.rot = 0;
            
            const pEl = document.createElement('div');
            pEl.className = 'pipe';
            if (pipe.isFixed) pEl.classList.add('fixed');
            if (pipe.start) pEl.classList.add('start');
            if (pipe.target) pEl.classList.add('target');
            
            pEl.id = pipe.id;
            pEl.innerHTML = pipeSVGs[pipe.type];
            
            if (pipe.start) pEl.innerHTML += '<svg class="faucet-icon" viewBox="0 0 24 24"><path d="M12 2v20M8 22h8M4 6h16M10 6V4a2 2 0 0 1 4 0v2"/></svg>';
            if (pipe.target) pEl.innerHTML += '<svg class="target-icon" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
            
            pEl.addEventListener('click', (e) => {
                e.stopPropagation();
                selectPipe(pipe);
            });
            
            boardEl.appendChild(pEl);
            updatePipeTransform(pipe);
        });
    }

    function updatePipeTransform(pipe) {
        const pEl = document.getElementById(pipe.id);
        if (!pEl) return;
        
        const gap = 4;
        const cellSize = 80;
        const left = pipe.x * (cellSize + gap);
        const top = pipe.y * (cellSize + gap);
        
        pEl.style.left = `${left}px`;
        pEl.style.top = `${top}px`;
        
        const svg = pEl.querySelector('svg:not(.faucet-icon):not(.target-icon)');
        if (svg) {
            svg.style.transform = `rotate(${pipe.rot * 90}deg) scaleX(${pipe.flipX}) scaleY(${pipe.flipY})`;
        }
    }

    function selectPipe(pipe) {
        if (pipe.isFixed) return;
        
        selectedPipe = pipe;
        
        document.querySelectorAll('.pipe').forEach(p => p.classList.remove('selected'));
        document.getElementById(pipe.id).classList.add('selected');
        
        const gap = 4;
        const cellSize = 80;
        const left = pipe.x * (cellSize + gap) + cellSize/2;
        const top = pipe.y * (cellSize + gap) + cellSize/2;
        
        overlayEl.style.left = `calc(${left}px - var(--cell-size) * 1.5)`;
        overlayEl.style.top = `calc(${top}px - var(--cell-size) * 1.5)`;
        overlayEl.classList.remove('hidden');
        
        highlightValidMoves(pipe);
    }

    function deselectPipe() {
        selectedPipe = null;
        document.querySelectorAll('.pipe').forEach(p => p.classList.remove('selected'));
        overlayEl.classList.add('hidden');
        clearHighlights();
    }

    function getPipeAt(x, y) {
        return pipesData.find(p => p.x === x && p.y === y);
    }

    function highlightValidMoves(pipe) {
        clearHighlights();
        // Check rows and cols
        for (let x = pipe.x - 1; x >= 0; x--) {
            if (getPipeAt(x, pipe.y)) break;
            addHighlight(x, pipe.y);
        }
        for (let x = pipe.x + 1; x < currentStage.cols; x++) {
            if (getPipeAt(x, pipe.y)) break;
            addHighlight(x, pipe.y);
        }
        for (let y = pipe.y - 1; y >= 0; y--) {
            if (getPipeAt(pipe.x, y)) break;
            addHighlight(pipe.x, y);
        }
        for (let y = pipe.y + 1; y < currentStage.rows; y++) {
            if (getPipeAt(pipe.x, y)) break;
            addHighlight(pipe.x, y);
        }
    }

    function addHighlight(x, y) {
        const cell = boardEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (cell) cell.classList.add('valid-move');
    }

    function clearHighlights() {
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('valid-move'));
    }

    function handleCellClick(x, y) {
        if (!selectedPipe) return;
        const cell = boardEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (cell.classList.contains('valid-move')) {
            selectedPipe.x = x;
            selectedPipe.y = y;
            updatePipeTransform(selectedPipe);
            selectPipe(selectedPipe); // Refresh overlay position
            incrementMoves();
        }
    }

    function rotatePipe(dir) {
        if (!selectedPipe) return;
        selectedPipe.rot = (selectedPipe.rot + dir + 4) % 4;
        updatePipeTransform(selectedPipe);
        incrementMoves();
    }

    function flipPipe() {
        if (!selectedPipe) return;
        // Flip X
        selectedPipe.flipX *= -1;
        updatePipeTransform(selectedPipe);
        incrementMoves();
    }

    function incrementMoves() {
        moves++;
        updateMovesDisplay();
    }

    function updateMovesDisplay() {
        movesDisplay.innerText = moves;
    }

    // --- Water Flow Logic ---
    function getOpenings(pipe) {
        let open = [...pipeBaseOpenings[pipe.type]];
        
        // Apply Flip X
        if (pipe.flipX === -1) {
            open = open.map(o => o === 1 ? 3 : (o === 3 ? 1 : o));
        }
        // Apply Flip Y
        if (pipe.flipY === -1) {
            open = open.map(o => o === 0 ? 2 : (o === 2 ? 0 : o));
        }
        
        // Apply Rotation
        open = open.map(o => (o + pipe.rot) % 4);
        
        return open;
    }

    function getAdjacent(x, y, dir) {
        switch(dir) {
            case 0: return {x, y: y-1}; // Top
            case 1: return {x: x+1, y}; // Right
            case 2: return {x, y: y+1}; // Bottom
            case 3: return {x: x-1, y}; // Left
        }
    }

    function checkWaterFlow() {
        deselectPipe();
        document.querySelectorAll('.pipe').forEach(p => p.classList.remove('flowing'));
        
        const startPipe = pipesData.find(p => p.start);
        const targetPipe = pipesData.find(p => p.target);
        
        if (!startPipe || !targetPipe) return;

        let queue = [startPipe];
        let visited = new Set();
        visited.add(startPipe.id);
        
        let targetReached = false;
        
        const animateFlow = () => {
            if (queue.length === 0) {
                if (targetReached) {
                    showClearModal();
                }
                return;
            }
            
            let current = queue.shift();
            const pEl = document.getElementById(current.id);
            if (pEl) pEl.classList.add('flowing');
            
            if (current.id === targetPipe.id) {
                targetReached = true;
                setTimeout(animateFlow, 300);
                return;
            }
            
            const openings = getOpenings(current);
            openings.forEach(dir => {
                const adjPos = getAdjacent(current.x, current.y, dir);
                const adjPipe = getPipeAt(adjPos.x, adjPos.y);
                
                if (adjPipe && !visited.has(adjPipe.id)) {
                    // Check if adjacent pipe has opening facing back
                    const adjOpenings = getOpenings(adjPipe);
                    const backDir = (dir + 2) % 4;
                    
                    if (adjOpenings.includes(backDir)) {
                        visited.add(adjPipe.id);
                        queue.push(adjPipe);
                    }
                }
            });
            
            setTimeout(animateFlow, 300);
        };
        
        animateFlow();
    }

    function showClearModal() {
        let stars = 1;
        const optimal = currentStage.optimalMoves;
        if (moves <= optimal + 1) stars = 3;
        else if (moves <= optimal + 4) stars = 2;
        
        // Show stars in UI footer
        const starEls = document.querySelectorAll('footer .star');
        starEls.forEach((el, i) => {
            if (i < stars) el.classList.remove('empty');
            else el.classList.add('empty');
        });
        
        // Show stars in Modal
        const modalStarEls = document.querySelectorAll('.modal-stars .star');
        modalStarEls.forEach((el, i) => {
            if (i < stars) el.classList.remove('empty');
            else el.classList.add('empty');
            
            el.style.color = (i < stars) ? '#ffd700' : 'rgba(255,255,255,0.2)';
            el.style.textShadow = (i < stars) ? '0 0 15px rgba(255,215,0,0.8)' : 'none';
        });
        
        clearModal.classList.remove('hidden');
    }

    function resetStars() {
        document.querySelectorAll('.star').forEach(el => el.classList.add('empty'));
    }

    function goToNextStage() {
        loadStage(currentStageIndex + 1);
    }
    
    // 임시 정답 확인 기능
    function autoSolveStage() {
        deselectPipe();
        pipesData.forEach(pipe => {
            if (pipe.answer) {
                pipe.x = pipe.answer.x;
                pipe.y = pipe.answer.y;
                pipe.rot = pipe.answer.rot;
                pipe.flipX = pipe.answer.flipX !== undefined ? pipe.answer.flipX : 1;
                pipe.flipY = pipe.answer.flipY !== undefined ? pipe.answer.flipY : 1;
                updatePipeTransform(pipe);
            }
        });
        moves = currentStage.optimalMoves; // 모범 이동 횟수로 세팅
        updateMovesDisplay();
        
        // 0.5초 후 물길 흐름 자동 체크
        setTimeout(checkWaterFlow, 500);
    }
    
    // Background Particles
    function initParticles() {
        const canvas = document.getElementById('bg-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const particles = [];
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 3 + 1,
                dx: (Math.random() - 0.5) * 0.5,
                dy: (Math.random() - 0.5) * 0.5,
                alpha: Math.random() * 0.5 + 0.1
            });
        }
        
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(102, 252, 241, ${p.alpha})`;
                ctx.fill();
                p.x += p.dx;
                p.y += p.dy;
                
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
            });
            requestAnimationFrame(draw);
        }
        draw();
        
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }
});
