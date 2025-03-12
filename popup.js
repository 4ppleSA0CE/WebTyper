document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['typingStats'], (result) => {
    const stats = result.typingStats || { games: [] };
    updateStatsDisplay(stats);
  });
});

document.getElementById('startGame').addEventListener('click', () => {
  const button = document.getElementById('startGame');
  button.disabled = true;
  button.textContent = 'Starting...';

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs[0]) {
      showError('Cannot access current tab');
      resetButton();
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, {action: "startGame"}, (response) => {
      if (chrome.runtime.lastError) {
        showError('Cannot start game on this page. Try refreshing the page.');
        resetButton();
        return;
      }

      if (!response || !response.success) {
        showError(response?.error || 'Failed to start game');
        resetButton();
        return;
      }

      window.close();
    });
  });

  function resetButton() {
    button.disabled = false;
    button.textContent = 'Start Typing Game';
  }

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      color: #dc3545;
      margin-top: 10px;
      padding: 8px;
      background: #f8d7da;
      border-radius: 4px;
      font-size: 14px;
    `;
    errorDiv.textContent = message;
    
    const existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    errorDiv.className = 'error-message';
    button.parentNode.insertBefore(errorDiv, button.nextSibling);
  }
});

function updateStatsDisplay(stats) {
  const games = stats.games || [];
  const recentGames = games.slice(-10);
  
  //recent averages
  const recentWPM = recentGames.length ? 
    (recentGames.reduce((sum, game) => sum + game.wpm, 0) / recentGames.length).toFixed(1) : 0;
  const recentAccuracy = recentGames.length ? 
    (recentGames.reduce((sum, game) => sum + game.accuracy, 0) / recentGames.length).toFixed(1) : 0;

  //overall averages
  const overallWPM = games.length ? 
    (games.reduce((sum, game) => sum + game.wpm, 0) / games.length).toFixed(1) : 0;
  const overallAccuracy = games.length ? 
    (games.reduce((sum, game) => sum + game.accuracy, 0) / games.length).toFixed(1) : 0;

  document.getElementById('recentWPM').textContent = recentWPM;
  document.getElementById('recentAccuracy').textContent = `${recentAccuracy}%`;
  document.getElementById('overallWPM').textContent = overallWPM;
  document.getElementById('overallAccuracy').textContent = `${overallAccuracy}%`;
  document.getElementById('totalGames').textContent = games.length;
}

document.getElementById('resetStats').addEventListener('click', () => {
  chrome.storage.local.set({ typingStats: { games: [] } }, () => {
    console.log('Statistics have been reset');
    // Optionally refresh your stats display in the popup
  });
}); 