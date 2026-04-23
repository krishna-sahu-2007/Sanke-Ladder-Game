const BOARD_SIZE = 10;
        const TOTAL_TILES = 100;
        
        let players = [
            { id: 1, pos: 1, color: '#ef4444', name: 'PLAYER 1' },
            { id: 2, pos: 1, color: '#3b82f6', name: 'PLAYER 2' }
        ];
        let currentPlayerIndex = 0;
        let turnCount = 0;
        let isRolling = false;

        let boardMechanics = {
            ladders: {},
            snakes: {},
            chaosVipers: [] // These move you randomly up OR down
        };

        const boardEl = document.getElementById('board');
        const rollBtn = document.getElementById('roll-btn');
        const diceEl = document.getElementById('dice-container');
        const turnInd = document.getElementById('turn-indicator');
        const logEl = document.getElementById('game-log');
        const shiftCounterEl = document.getElementById('shift-counter');

        function generateRandomBoard() {
            // Reset mechanics
            boardMechanics = { ladders: {}, snakes: {}, chaosVipers: [] };

            // Fixed "Titan Snake" at 99
            boardMechanics.snakes[99] = 1;

            const used = new Set([1, 100, 99]);

            // Random Ladders (5-7)
            for (let i = 0; i < 6; i++) {
                let start = Math.floor(Math.random() * 80) + 2;
                let end = start + Math.floor(Math.random() * 20) + 10;
                if (end > 98) end = 98;
                if (!used.has(start) && !used.has(end)) {
                    boardMechanics.ladders[start] = end;
                    used.add(start); used.add(end);
                }
            }

            // Random Snakes (6-8)
            for (let i = 0; i < 7; i++) {
                let start = Math.floor(Math.random() * 80) + 15;
                if (start === 99) continue;
                let end = start - (Math.floor(Math.random() * 20) + 10);
                if (end < 2) end = 2;
                if (!used.has(start) && !used.has(end)) {
                    boardMechanics.snakes[start] = end;
                    used.add(start); used.add(end);
                }
            }

            // Chaos Vipers (Special random pushers)
            for (let i = 0; i < 4; i++) {
                let pos = Math.floor(Math.random() * 70) + 15;
                if (!used.has(pos)) {
                    boardMechanics.chaosVipers.push(pos);
                    used.add(pos);
                }
            }

            renderTiles();
        }

        function renderTiles() {
            boardEl.querySelectorAll('.tile').forEach(t => t.remove());
            for (let r = BOARD_SIZE - 1; r >= 0; r--) {
                const isEvenRow = r % 2 !== 0;
                if (!isEvenRow) {
                    for (let c = 0; c < BOARD_SIZE; c++) createTile(r, c);
                } else {
                    for (let c = BOARD_SIZE - 1; c >= 0; c--) createTile(r, c);
                }
            }
        }

        function createTile(r, c) {
            const id = r * BOARD_SIZE + c + 1;
            const tile = document.createElement('div');
            tile.className = `tile funky-${(r + c) % 3 + 1}`;
            tile.id = `tile-${id}`;
            
            const span = document.createElement('span');
            span.className = 'tile-id';
            span.textContent = id;
            tile.appendChild(span);

            if (id === 99) {
                tile.classList.add('danger-zone');
                tile.innerHTML += `<div class="connector-label">💀</div>`;
            } else if (boardMechanics.ladders[id]) {
                tile.innerHTML += `<div class="connector-label">🪜</div>`;
            } else if (boardMechanics.snakes[id]) {
                tile.innerHTML += `<div class="connector-label">🐍</div>`;
            } else if (boardMechanics.chaosVipers.includes(id)) {
                tile.innerHTML += `<div class="connector-label animate-pulse">⚡</div>`;
            }

            boardEl.appendChild(tile);
        }

        async function handleTurn() {
            if (isRolling) return;

            const player = players[currentPlayerIndex];
            isRolling = true;
            rollBtn.disabled = true;
            diceEl.classList.add('dice-roll-anim');
            
            let roll = 0;
            for(let i=0; i<8; i++) {
                roll = Math.floor(Math.random() * 6) + 1;
                diceEl.textContent = roll;
                await new Promise(r => setTimeout(r, 80));
            }
            
            diceEl.classList.remove('dice-roll-anim');
            log(`${player.name} ROLLED A ${roll}`);

            await movePlayer(player, roll);

            if (player.pos === TOTAL_TILES) {
                showWin(player);
                return;
            }

            turnCount++;
            let turnsUntilShift = 5 - (turnCount % 5);
            shiftCounterEl.textContent = turnsUntilShift === 5 ? 0 : turnsUntilShift;

            if (turnCount > 0 && turnCount % 5 === 0) {
                await shiftBoard();
            }

            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
            updateTurnUI();
            isRolling = false;
            rollBtn.disabled = false;
        }

        async function movePlayer(player, steps) {
            let targetPos = player.pos + steps;
            if (targetPos > TOTAL_TILES) targetPos = TOTAL_TILES - (targetPos - TOTAL_TILES);
            if (targetPos < 1) targetPos = 1;

            while (player.pos !== targetPos) {
                player.pos += (targetPos > player.pos ? 1 : -1);
                updatePlayerUI(player.id);
                await new Promise(r => setTimeout(r, 150));
            }

            await checkSpecialTiles(player);
        }

        async function checkSpecialTiles(player) {
            // Titan Snake
            if (player.pos === 99) {
                log(`💀 THE TITAN SNAKE STRUCK!`, 'danger');
                player.pos = 1;
                updatePlayerUI(player.id);
                await new Promise(r => setTimeout(r, 800));
                return;
            }

            // Normal Ladders
            if (boardMechanics.ladders[player.pos]) {
                log(`${player.name} CLIMBED A LADDER!`, 'success');
                player.pos = boardMechanics.ladders[player.pos];
                updatePlayerUI(player.id);
                await new Promise(r => setTimeout(r, 400));
            } 
            // Normal Snakes
            else if (boardMechanics.snakes[player.pos]) {
                log(`${player.name} SLID DOWN A SNAKE!`, 'danger');
                player.pos = boardMechanics.snakes[player.pos];
                updatePlayerUI(player.id);
                await new Promise(r => setTimeout(r, 400));
            }
            // Chaos Vipers (Random +/-)
            else if (boardMechanics.chaosVipers.includes(player.pos)) {
                const jump = Math.floor(Math.random() * 20) + 10;
                const isBoost = Math.random() > 0.5;
                log(`⚡ CHAOS VIPER: ${isBoost ? 'BOOST!' : 'STRIKE!'}`, 'chaos');
                await movePlayer(player, isBoost ? jump : -jump);
            }
        }

        async function shiftBoard() {
            boardEl.classList.add('shifting-active');
            log(`🌀 REALITY SHIFTING! BOARD MOVING...`, 'chaos');
            await new Promise(r => setTimeout(r, 1500));
            
            generateRandomBoard();
            players.forEach(p => updatePlayerUI(p.id));
            
            boardEl.classList.remove('shifting-active');
            shiftCounterEl.textContent = "5";
        }

        function updatePlayerUI(id) {
            const p = players.find(x => x.id === id);
            const tile = document.getElementById(`tile-${p.pos}`);
            const token = document.getElementById(`player-${p.id}`);
            if (tile && token) {
                token.style.left = `${tile.offsetLeft + tile.offsetWidth/2 - 11 + (id===1?-6:6)}px`;
                token.style.top = `${tile.offsetTop + tile.offsetHeight/2 - 11}px`;
            }
        }

        function log(msg, type = 'info') {
            const entry = document.createElement('div');
            const colors = { success: 'text-emerald-400', danger: 'text-red-400', chaos: 'text-purple-400 font-bold' };
            entry.className = colors[type] || 'text-slate-400';
            entry.textContent = `• ${msg}`;
            logEl.prepend(entry);
        }

        function updateTurnUI() {
            const p = players[currentPlayerIndex];
            turnInd.textContent = `${p.name}'S TURN`;
            turnInd.style.color = p.color;
            rollBtn.style.backgroundColor = p.color;
        }

        function showWin(player) {
            document.getElementById('winner-text').textContent = player.name;
            document.getElementById('win-modal').classList.remove('hidden');
        }

        rollBtn.onclick = handleTurn;
        window.onload = () => {
            generateRandomBoard();
            players.forEach(p => {
                const t = document.createElement('div');
                t.id = `player-${p.id}`; t.className = 'player-token';
                t.style.backgroundColor = p.color;
                boardEl.appendChild(t);
                updatePlayerUI(p.id);
            });
            updateTurnUI();
        };

        window.onresize = () => players.forEach(p => updatePlayerUI(p.id));