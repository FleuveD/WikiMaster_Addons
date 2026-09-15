// =========================================================================
// WIKIMASTER AUTO-OPENER CONTENT SCRIPT
// =========================================================================
// Ce script est injecté sur la page de Wikimaster.
// Comme la structure exacte du site n'est pas connue, vous devrez peut-être
// adapter les sélecteurs CSS ci-dessous.
// =========================================================================

const CONFIG = {
  // Sélecteur du conteneur où ajouter le bouton "Ouvrir tout" (ici la boîte d'infos des paquets)
  buttonContainerSelector: '.card-frame',

  // Sélecteur pour identifier un pack non ouvert (l'image à l'intérieur du bouton)
  packImageSelector: 'img[alt="Ouvrir un paquet"]',

  // Sélecteur pour détecter l'apparition d'une nouvelle carte
  cardResultSelector: '.card-reveal',

  // Sélecteurs pour extraire les infos de la carte depuis l'élément cardResultSelector
  cardNameSelector: '.card-name',
  cardRaritySelector: '.card-rarity',
  cardImageSelector: 'img'
};

function injectOpenAllButton() {
  if (document.getElementById('wikimaster-open-all-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'wikimaster-open-all-btn';
  btn.innerText = 'Ouvrir Tout';
  btn.style.cssText = `
    padding: 12px 24px;
    background: #4cd68fff;
    color: #efefefff;
    border-radius: 12px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
  `;

  btn.onmouseover = () => {
    if (!btn.disabled) {
      btn.style.background = 'rgba(50, 151, 75, 1)'; // Vert légèrement plus foncé
      btn.style.color = '#d4d4d4';      // Blanc/Gris légèrement plus foncé
      btn.style.transform = 'translateY(-2px)';
    }
  };

  btn.onmouseout = () => {
    if (!btn.disabled) {
      btn.style.background = '#4cd68fff'; // Vert d'origine
      btn.style.color = '#efefefff';    // Couleur de texte d'origine
      btn.style.transform = 'translateY(0)';
    }
  };

  btn.addEventListener('click', openAllPacks);

  // Essayer d'injecter après le conteneur spécifique, sinon dans le body
  const container = document.querySelector(CONFIG.buttonContainerSelector);
  if (container) {
    container.parentElement.appendChild(btn);
  } else {
    document.body.appendChild(btn);
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForElement(selectorFn, conditionFn = (el) => !el.disabled, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = selectorFn();
    if (el && conditionFn(el)) return el;
    await sleep(50); // check every 50ms
  }
  return null;
}

function logDebug(msg) {
  console.log(msg);
  chrome.storage.local.get({ debugLogs: [] }, (res) => {
    let logs = res.debugLogs;
    logs.unshift({ time: new Date().toLocaleTimeString(), msg: msg });
    if (logs.length > 50) logs.pop();
    chrome.storage.local.set({ debugLogs: logs });
  });
}

async function openAllPacks() {
  const btnOpenAll = document.getElementById('wikimaster-open-all-btn');
  if (btnOpenAll) {
    btnOpenAll.disabled = true;
    btnOpenAll.innerText = 'Ouverture en cours...';
  }

  logDebug("[START] Lancement de l'ouverture automatique.");

  while (true) {
    // Vérifier si le compteur est à 0 (format dans la box "8 / 10")
    const counterSpan = document.querySelector('.card-frame .text-lg.font-bold span:first-child');
    if (counterSpan && counterSpan.innerText.trim() === '0') {
      logDebug("[END] Tous les paquets sont ouverts !");
      break;
    }

    // 1. Attendre et cliquer sur le paquet principal
    logDebug("[WAIT] Attente du paquet...");
    const packBtn = await waitForElement(() => {
      const img = document.querySelector(CONFIG.packImageSelector);
      return img ? img.closest('button') : null;
    });

    if (!packBtn) {
      logDebug("[ERROR] Bouton du paquet introuvable (timeout), arrêt de la boucle.");
      break;
    }
    packBtn.click();
    logDebug("[ACTION] Paquet cliqué.");

    // 2. Cliquer 4 fois sur la flèche pour passer les cartes
    for (let i = 0; i < 4; i++) {
      // Attendre que la flèche soit disponible et cliquable
      const arrowBtn = await waitForElement(() => {
        const polyline = document.querySelector('polyline[points*="9 18 15 12 9 6"]');
        return polyline ? polyline.closest('button') : null;
      });

      if (arrowBtn) {
        arrowBtn.click();
        logDebug("[ACTION] Flèche " + (i + 1) + "/4 cliquée.");
        // Un très court délai pour éviter que le navigateur interprète ça comme un double-clic
        await sleep(50);
      } else {
        logDebug("[ERROR] Bouton flèche introuvable pour le clic " + (i + 1));
        break; // Sortir de la boucle des flèches si introuvable
      }
    }

    // 3. Attendre et cliquer sur le bouton "Continuer"
    logDebug("[WAIT] Attente du bouton Continuer...");
    const continueBtn = await waitForElement(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.trim().toLowerCase() === 'continuer');
    });

    if (continueBtn) {
      continueBtn.click();
      logDebug("[ACTION] Bouton Continuer cliqué.");
    } else {
      logDebug("[ERROR] Bouton Continuer introuvable (timeout).");
      break; // Sortir de la boucle principale
    }

    // Attente pour éviter l'erreur anti-spam du site ("Ouverture trop rapide")
    logDebug("[WAIT] Pause de 1.5s avant le prochain paquet (anti-spam)...");
    await sleep(1500);
  }

  logDebug("[END] Fin du script automatique.");
  if (btnOpenAll) {
    btnOpenAll.disabled = false;
    btnOpenAll.innerText = 'Ouvrir Tout';
  }
}

// Fonction pour sauvegarder une carte dans l'historique
function saveCardToHistory(card) {
  chrome.storage.local.get({ cardHistory: [] }, (result) => {
    const history = result.cardHistory;
    // Ajouter au début de l'historique
    history.unshift({
      ...card,
      timestamp: Date.now()
    });

    // Garder seulement les 100 dernières cartes pour ne pas surcharger le storage
    if (history.length > 100) {
      history.pop();
    }

    chrome.storage.local.set({ cardHistory: history });
  });
}

// Observer le DOM pour détecter l'apparition de nouvelles cartes
function observeCards() {
  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Vérifier si le noeud inséré est une carte ou contient une carte
          const cards = node.matches(CONFIG.cardResultSelector)
            ? [node]
            : node.querySelectorAll(CONFIG.cardResultSelector);

          cards.forEach(cardNode => {
            try {
              const nameEl = cardNode.querySelector(CONFIG.cardNameSelector);
              const rarityEl = cardNode.querySelector(CONFIG.cardRaritySelector);
              const imgEl = cardNode.querySelector(CONFIG.cardImageSelector);

              if (nameEl || rarityEl) {
                const cardData = {
                  name: nameEl ? nameEl.innerText.trim() : 'Inconnu',
                  rarity: rarityEl ? rarityEl.innerText.trim() : 'Commune',
                  imageUrl: imgEl ? imgEl.src : ''
                };
                console.log("[Wikimaster Extension] Nouvelle carte détectée:", cardData);
                saveCardToHistory(cardData);
              }
            } catch (e) {
              console.error("[Wikimaster Extension] Erreur lors de l'extraction de la carte:", e);
            }
          });
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialisation
function init() {
  // L'URL peut changer dynamiquement et React/Next.js re-rend le DOM fréquemment.
  // On utilise un observer global pour s'assurer que le bouton reste présent et à jour.
  const observer = new MutationObserver(() => {
    if (window.location.pathname.includes('/pulls')) {
      let btn = document.getElementById('wikimaster-open-all-btn');
      if (!btn) {
        const container = document.querySelector(CONFIG.buttonContainerSelector);
        if (container) {
          injectOpenAllButton();
          btn = document.getElementById('wikimaster-open-all-btn');
        }
      }

      // Griser le bouton si le compteur est à 0 et que le script n'est pas en cours
      if (btn && btn.innerText !== 'Ouverture en cours...') {
        const counterSpan = document.querySelector('.card-frame .text-lg.font-bold span:first-child');
        if (counterSpan) {
          const count = counterSpan.innerText.trim();
          if (count === '0') {
            if (btn.innerText !== 'Aucun paquet') {
              btn.disabled = true;
              btn.style.opacity = '0.4';
              btn.style.cursor = 'not-allowed';
              btn.innerText = 'Aucun paquet';
            }
          } else {
            if (btn.innerText === 'Aucun paquet') {
              btn.disabled = false;
              btn.style.opacity = '1';
              btn.style.cursor = 'pointer';
              btn.innerText = 'Ouvrir Tout';
            }
          }
        }
      }

    } else {
      const btn = document.getElementById('wikimaster-open-all-btn');
      if (btn) btn.remove();
    }
  });

  observer.observe(document.body, { subtree: true, childList: true });

  // On lance aussi une première tentative d'injection immédiate si on est sur la bonne page
  if (window.location.pathname.includes('/pulls')) {
    setTimeout(() => {
      const container = document.querySelector(CONFIG.buttonContainerSelector);
      if (container) injectOpenAllButton();
    }, 1000);
  }

  observeCards();
}

// Lancer l'initialisation quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
