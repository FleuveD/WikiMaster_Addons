// Configuration des raretés avec leur "poids" pour le tri (plus c'est élevé, plus c'est rare)
// À ADAPTER SELON LES RARETÉS RÉELLES DU JEU
const RARITY_WEIGHTS = {
  'mythic': 60,
  'mythique': 60,
  'legendary': 50,
  'légendaire': 50,
  'epic': 40,
  'épique': 40,
  'rare': 30,
  'uncommon': 20,
  'peu commune': 20,
  'common': 10,
  'commune': 10
};

// Fonction pour déterminer le poids d'une rareté
function getRarityWeight(rarityStr) {
  const normalized = rarityStr.toLowerCase().trim();
  for (const [key, weight] of Object.entries(RARITY_WEIGHTS)) {
    if (normalized.includes(key)) {
      return weight;
    }
  }
  return 0; // Poids par défaut si non reconnu
}

// Fonction pour récupérer la classe CSS associée à la rareté
function getRarityClass(rarityStr) {
  const normalized = rarityStr.toLowerCase().trim();
  if (normalized.includes('mythic') || normalized.includes('mythique')) return 'rarity-mythic';
  if (normalized.includes('legendary') || normalized.includes('légendaire')) return 'rarity-legendary';
  if (normalized.includes('epic') || normalized.includes('épique')) return 'rarity-epic';
  if (normalized.includes('rare') && !normalized.includes('peu')) return 'rarity-rare';
  if (normalized.includes('uncommon') || normalized.includes('peu commune')) return 'rarity-uncommon';
  return 'rarity-common';
}

function renderCards() {
  chrome.storage.local.get({ cardHistory: [] }, (result) => {
    const history = result.cardHistory;
    const listEl = document.getElementById('card-list');
    const countEl = document.getElementById('total-cards');
    
    countEl.innerText = history.length;
    
    if (history.length === 0) {
      listEl.innerHTML = '<div class="empty-state">Aucune carte trouvée. Allez ouvrir des packs !</div>';
      return;
    }

    // Trier les cartes par rareté (décroissant), puis par date (les plus récentes d'abord)
    const sortedHistory = [...history].sort((a, b) => {
      const weightA = getRarityWeight(a.rarity);
      const weightB = getRarityWeight(b.rarity);
      if (weightA !== weightB) {
        return weightB - weightA; // Rareté la plus haute en premier
      }
      return b.timestamp - a.timestamp; // Si rareté égale, la plus récente en premier
    });

    listEl.innerHTML = '';
    
    sortedHistory.forEach(card => {
      const div = document.createElement('div');
      const rarityClass = getRarityClass(card.rarity);
      div.className = `card-item ${rarityClass}`;
      
      const imgSrc = card.imageUrl ? card.imageUrl : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="56"><rect width="100%" height="100%" fill="%23333"/><text x="50%" y="50%" font-size="10" fill="white" text-anchor="middle" dominant-baseline="middle">?</text></svg>';

      div.innerHTML = `
        <img src="${imgSrc}" class="card-image" alt="Carte" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'40\\' height=\\'56\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23333\\'/><text x=\\'50%\\' y=\\'50%\\' font-size=\\'10\\' fill=\\'white\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\'>?</text></svg>'">
        <div class="card-info">
          <div class="card-name">${card.name}</div>
          <div class="card-rarity">${card.rarity}</div>
        </div>
      `;
      
      listEl.appendChild(div);
    });
  });
}

// Clear history
document.getElementById('clear-btn').addEventListener('click', () => {
  if (confirm("Voulez-vous vraiment effacer tout l'historique des cartes ?")) {
    chrome.storage.local.set({ cardHistory: [] }, () => {
      renderCards();
    });
  }
});

// Render Logs
let logsInterval = null;
function renderLogs() {
  chrome.storage.local.get({ debugLogs: [] }, (result) => {
    const logs = result.debugLogs;
    const content = document.getElementById('logs-content');
    content.innerHTML = logs.map(l => `<div><span style="color:#888">[${l.time}]</span> ${l.msg}</div>`).join('');
  });
}

document.getElementById('toggle-debug-btn').addEventListener('click', () => {
  const logsEl = document.getElementById('debug-logs');
  logsEl.classList.toggle('hidden');
});

document.getElementById('copy-logs-btn').addEventListener('click', () => {
  chrome.storage.local.get({ debugLogs: [] }, (result) => {
    const text = result.debugLogs.map(l => `[${l.time}] ${l.msg}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copy-logs-btn');
      btn.innerText = 'Copié !';
      setTimeout(() => btn.innerText = 'Copier', 2000);
    });
  });
});

// Initial render
document.addEventListener('DOMContentLoaded', () => {
  renderCards();
  renderLogs();
  setInterval(renderLogs, 1000);
});
