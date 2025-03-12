let gameActive = false;
let currentIndex = 0;
let gameText = '';
let overlay;
let textDisplay;
let accuracy = 0;
let mistakes = 0;
let startTime;

function resetGameState() {
  gameActive = false;
  currentIndex = 0;
  gameText = '';
  accuracy = 0;
  mistakes = 0;
  startTime = null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startGame") {
    if (!gameActive) {
      try {
        startGame();
        sendResponse({ success: true });
      } catch (error) {
        console.error('Failed to start game:', error);
        sendResponse({ success: false, error: error.message });
      }
    }
  }
  return true;
});

function startGame() {
  resetGameState();
  
  gameActive = true;
  startTime = Date.now();
  
  const visibleText = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article'))
    .filter(element => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             element.textContent.trim().length > 0;
    })
    .map(element => element.textContent.trim())
    .join(' ')
    .replace(/\s+/g, ' ');
  
  // Filter out special characters
  gameText = visibleText.trim()
    .replace(/[^a-zA-Z0-9\s.,!?'-]/g, '')
    .replace(/\s+/g, ' ');
  
  if (!gameText) {
    throw new Error('No valid text found on this page');
  }
  
  // Create overlay
  overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    color: white;
    font-family: monospace;
  `;
  
  textDisplay = document.createElement('div');
  textDisplay.style.cssText = `
    max-width: 800px;
    width: 100%;
    height: 60vh;
    font-size: 18px;
    line-height: 1.5;
    white-space: pre-wrap;
    margin-bottom: 20px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow-y: auto;
    contain: content;
    will-change: transform;
  `;
  
  const statsContainer = document.createElement('div');
  statsContainer.style.cssText = `
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    font-size: 16px;
  `;
  
  //stats display
  const stats = document.createElement('div');
  stats.innerHTML = `
    <span>WPM: <span id="wpm">0</span></span> |
    <span>Accuracy: <span id="accuracy">100</span>%</span> |
    <span>Mistakes: <span id="mistakes">0</span></span>
  `;
  
  //stop button
  const stopButton = document.createElement('button');
  stopButton.textContent = 'Stop Game (Esc)';
  stopButton.style.cssText = `
    padding: 8px 16px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  stopButton.addEventListener('click', stopGame);
  
  statsContainer.appendChild(stats);
  statsContainer.appendChild(stopButton);
  
  overlay.appendChild(statsContainer);
  overlay.appendChild(textDisplay);
  document.body.appendChild(overlay);
  
  updateDisplay();
  
  document.addEventListener('keydown', handleKeyPress);
}

function updateDisplay() {
  requestAnimationFrame(() => {
    const completed = `<span style="color: #4CAF50">${gameText.substring(0, currentIndex)}</span>`;
    const current = `<span style="background: white; color: black">${gameText[currentIndex]}</span>`;
    const remaining = gameText.substring(currentIndex + 1);
    textDisplay.innerHTML = completed + current + remaining;
    
    const currentChar = textDisplay.querySelector('span[style*="background: white"]');
    if (currentChar) {
      currentChar.scrollIntoView({ 
        behavior: 'auto',
        block: 'center'
      });
    }
  });
}

function calculateWPM() {
  const timeElapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
  const wordsTyped = currentIndex / 5; // standard word length
  return Math.round(wordsTyped / timeElapsed);
}

function updateStats() {
  const wpm = calculateWPM();
  accuracy = Math.max(0, ((currentIndex - mistakes) / currentIndex * 100).toFixed(1));
  
  document.getElementById('wpm').textContent = wpm;
  document.getElementById('accuracy').textContent = accuracy;
  document.getElementById('mistakes').textContent = mistakes;
  return wpm;
}

function stopGame() {
  if (!gameActive) return;
  
  gameActive = false;
  const finalWPM = updateStats();
  
  //Save stats
  chrome.storage.local.get(['typingStats'], (result) => {
    const stats = result.typingStats || { games: [] };
    stats.games.push({
      wpm: finalWPM,
      accuracy: parseFloat(accuracy),
      date: new Date().toISOString()
    });
    chrome.storage.local.set({ typingStats: stats });
  });

  cleanup();
  resetGameState();
}

function handleKeyPress(e) {
  if (!gameActive) return;
  
  e.preventDefault();
  
  if (e.key === 'Escape') {
    stopGame();
    return;
  }
  
  if (e.key === 'Shift') {
    return;
  }
  
  const expectedChar = gameText[currentIndex];
  let typedChar = e.key;
  
  // If shift is pressed, force uppercase
  if (e.shiftKey && typedChar.length === 1) {
    typedChar = typedChar.toUpperCase();
  } else if (!e.shiftKey && typedChar.length === 1) {
    typedChar = typedChar.toLowerCase();
  }
  
  const isCorrect = typedChar === expectedChar;
  
  if (isCorrect) {
    currentIndex++;
    updateDisplay();
    accuracy = ((currentIndex - mistakes) / currentIndex * 100).toFixed(1);
  } else {
    mistakes++;
  }
  updateStats();
  
  if (currentIndex >= gameText.length) {
    stopGame();
  }
}

function cleanup() {
  document.removeEventListener('keydown', handleKeyPress);
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
}

function resetStats() {
  chrome.storage.local.set({ typingStats: { games: [] } }, () => {
    console.log('Statistics have been reset');
  });
} 