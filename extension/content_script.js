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
    background: #34d399;
    color: #ffffff;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 48px;
  `;

  btn.onmouseover = () => {
    if (!btn.disabled) {
      btn.style.background = '#6ee7b7';
      btn.style.color = '#ffffff';
    }
  };

  btn.onmouseout = () => {
    if (!btn.disabled) {
      btn.style.background = '#34d399';
      btn.style.color = '#ffffff';
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
    btnOpenAll.dataset.running = 'true';
    btnOpenAll.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation: wikimaster-spin 1s linear infinite; transform-origin: center;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;
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
    delete btnOpenAll.dataset.running;
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

// ---------------------------------------------------------
// LOGIQUE POUR LA PAGE DES SUCCÈS (/achievements)
// ---------------------------------------------------------

function injectClaimAllButton() {
  if (document.getElementById('wikimaster-claim-all-btn')) return;

  // On cible le conteneur du titre "Succès" tout en haut de la page
  const h1 = Array.from(document.querySelectorAll('h1')).find(el => el.innerText.includes('Succès'));
  if (!h1) return;
  const titleContainer = h1.parentElement;

  const btn = document.createElement('button');
  btn.id = 'wikimaster-claim-all-btn';
  btn.innerText = 'Tout réclamer';

  // Style similaire au bouton "Ouvrir tout"
  btn.style.cssText = `
    padding: 12px 24px;
    background: #34d399;
    color: #ffffff;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-height: 48px;
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
  `;

  btn.onmouseover = () => {
    if (!btn.disabled) {
      btn.style.background = '#6ee7b7';
      btn.style.color = '#ffffff';
    }
  };

  btn.onmouseout = () => {
    if (!btn.disabled) {
      btn.style.background = '#34d399';
      btn.style.color = '#ffffff';
    }
  };

  btn.addEventListener('click', claimAllAchievements);

  // On met le conteneur du titre en relative pour que le bouton en absolute se cale à droite
  titleContainer.style.position = 'relative';
  titleContainer.appendChild(btn);
}

async function claimAllAchievements() {
  const btn = document.getElementById('wikimaster-claim-all-btn');
  if (btn) {
    btn.disabled = true;
    btn.dataset.running = 'true';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation: wikimaster-spin 1s linear infinite; transform-origin: center;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;
  }

  logDebug("[START] Réclamation automatique des succès.");

  while (true) {
    // Récupérer tous les boutons 'Réclamer' actifs
    const buttons = Array.from(document.querySelectorAll('button')).filter(b =>
      b.innerText.trim() === 'Réclamer' && !b.disabled
    );

    if (buttons.length === 0) {
      logDebug("[END] Tous les succès ont été réclamés !");
      break;
    }

    logDebug(`[ACTION] Clic sur Réclamer... (Reste: ${buttons.length})`);
    buttons[0].click();

    // Attendre 600ms pour laisser le temps à la requête de s'exécuter et au bouton de se désactiver
    await sleep(600);
  }

  if (btn) {
    btn.disabled = false;
    delete btn.dataset.running;
    btn.innerText = 'Tout réclamer';
  }
}

// ---------------------------------------------------------
// LOGIQUE POUR LA PAGE PARAMÈTRES (/settings)
// ---------------------------------------------------------

function injectLogsPanel() {
  if (document.getElementById('wikimaster-logs-wrapper')) return;

  const maxWContainer = document.querySelector('.max-w-lg');
  if (!maxWContainer || !maxWContainer.querySelector('h1')?.innerText.includes('Paramètres')) return;

  // Injecter les styles spécifiques pour le layout
  if (!document.getElementById('wikimaster-logs-style')) {
    const style = document.createElement('style');
    style.id = 'wikimaster-logs-style';
    style.innerHTML = `
      #wikimaster-logs-wrapper {
        display: flex;
        flex-direction: column;
        gap: 24px;
        width: 100%;
        align-items: stretch;
      }
      #wikimaster-logs-container {
        position: relative;
        width: 464px;
        height: 512px;
        min-height: 400px;
        margin-bottom: 24px;
      }
      @media (min-width: 1024px) {
        #wikimaster-logs-wrapper {
          flex-direction: row;
          padding-right: 24px;
          padding-top: 48px;
          padding-bottom: 48px;
        }
        #wikimaster-logs-container {
          min-height: 0;
          margin-bottom: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const wrapper = document.createElement('div');
  wrapper.id = 'wikimaster-logs-wrapper';

  maxWContainer.parentElement.insertBefore(wrapper, maxWContainer);
  wrapper.appendChild(maxWContainer);

  const panelContainer = document.createElement('div');
  panelContainer.id = 'wikimaster-logs-container';

  const panel = document.createElement('div');
  panel.id = 'wikimaster-logs-panel';
  panel.className = 'card-frame p-5 animate-fade-in-up';
  panel.style.position = 'absolute';
  panel.style.top = '0';
  panel.style.bottom = '0';
  panel.style.left = '0';
  panel.style.right = '0';
  panel.style.overflowY = 'auto';

  panel.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-[var(--color-foreground)]/60" style="font-family: var(--font-heading);">Console Wikimaster</h3>
      <div class="flex gap-2">
        <button id="wikimaster-copy-logs" title="Copier les logs" class="p-1.5 rounded bg-[var(--color-surface-light)] hover:bg-[var(--color-surface)] text-[var(--color-foreground)] transition-colors border border-[var(--color-border)] cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button id="wikimaster-clear-logs" title="Effacer les logs" class="p-1.5 rounded bg-[var(--color-surface-light)] hover:bg-red-500/20 text-[var(--color-foreground)] hover:text-red-400 transition-colors border border-[var(--color-border)] hover:border-red-500/30 cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
    <div id="wikimaster-logs-content" class="text-xs font-mono space-y-2" style="color: var(--color-foreground); opacity: 0.8;"></div>
  `;

  panelContainer.appendChild(panel);
  wrapper.appendChild(panelContainer);

  const renderLogs = () => {
    const content = document.getElementById('wikimaster-logs-content');
    if (!content) return;

    // Vérification de sécurité : si le contexte de l'extension est invalidé (rechargement)
    if (!chrome.runtime?.id) {
      clearInterval(Number(panel.dataset.intervalId));
      content.innerHTML = "<div style='color: #ef4444; font-style: italic; padding: 10px;'>L'extension a été mise à jour. Veuillez actualiser la page (F5).</div>";
      return;
    }

    try {
      chrome.storage.local.get({ debugLogs: [] }, (result) => {
        const logs = result.debugLogs;
        if (logs.length === 0) {
          content.innerHTML = '<div style="opacity: 0.5; font-style: italic;">Aucun log récent...</div>';
        } else {
          content.innerHTML = logs.map(l => `<div style="padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:#a855f7;font-weight:bold;">[${l.time}]</span> ${l.msg}</div>`).join('');
        }
      });
    } catch (e) {
      clearInterval(Number(panel.dataset.intervalId));
      content.innerHTML = "<div style='color: #ef4444; font-style: italic; padding: 10px;'>L'extension a été mise à jour. Veuillez actualiser la page (F5).</div>";
    }
  };

  renderLogs();
  panel.dataset.intervalId = setInterval(renderLogs, 1000);

  document.getElementById('wikimaster-copy-logs').addEventListener('click', () => {
    chrome.storage.local.get({ debugLogs: [] }, (result) => {
      const text = result.debugLogs.map(l => `[${l.time}] ${l.msg}`).join('\\n');
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('wikimaster-copy-logs');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        setTimeout(() => btn.innerHTML = originalHTML, 2000);
      });
    });
  });

  document.getElementById('wikimaster-clear-logs').addEventListener('click', () => {
    chrome.storage.local.set({ debugLogs: [] }, () => {
      renderLogs();
    });
  });
}

// Initialisation
function init() {
  // Injecter les styles CSS pour l'animation s'ils ne sont pas déjà là
  if (!document.getElementById('wikimaster-styles')) {
    const style = document.createElement('style');
    style.id = 'wikimaster-styles';
    style.innerHTML = `@keyframes wikimaster-spin { 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

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
      if (btn && btn.dataset.running !== 'true') {
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

    if (window.location.pathname.includes('/achievements')) {
      let claimBtn = document.getElementById('wikimaster-claim-all-btn');
      if (!claimBtn) {
        injectClaimAllButton();
        claimBtn = document.getElementById('wikimaster-claim-all-btn');
      }

      if (claimBtn && claimBtn.dataset.running !== 'true') {
        const claimableButtons = Array.from(document.querySelectorAll('button')).filter(b =>
          b.innerText.trim() === 'Réclamer' && !b.disabled
        );

        if (claimableButtons.length === 0) {
          if (claimBtn.innerText !== 'Rien à réclamer') {
            claimBtn.disabled = true;
            claimBtn.style.opacity = '0.4';
            claimBtn.style.cursor = 'not-allowed';
            claimBtn.innerText = 'Rien à réclamer';
          }
        } else {
          const expectedText = `Tout réclamer (${claimableButtons.length})`;
          if (claimBtn.innerText === 'Rien à réclamer') {
            claimBtn.disabled = false;
            claimBtn.style.opacity = '1';
            claimBtn.style.cursor = 'pointer';
            claimBtn.innerText = expectedText;
          } else if (claimBtn.innerText !== expectedText) {
            claimBtn.innerText = expectedText;
          }
        }
      }
    } else {
      const claimBtn = document.getElementById('wikimaster-claim-all-btn');
      if (claimBtn) claimBtn.remove();
    }

    if (window.location.pathname.includes('/settings')) {
      injectLogsPanel();
    } else {
      const wrapper = document.getElementById('wikimaster-logs-wrapper');
      if (wrapper) {
        const panel = document.getElementById('wikimaster-logs-panel');
        if (panel && panel.dataset.intervalId) {
          clearInterval(Number(panel.dataset.intervalId));
        }
        if (panel) panel.remove();

        const maxW = wrapper.querySelector('.max-w-lg');
        if (maxW) wrapper.parentElement.insertBefore(maxW, wrapper);
        wrapper.remove();
      }
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
