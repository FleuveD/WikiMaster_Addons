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

const THEMES = {
  emerald: { name: 'Vert (Défaut)', accent: '#34d399', gradient: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' },
  amethyst: { name: 'Violet', accent: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)' },
  ocean: { name: 'Bleu', accent: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' },
  ruby: { name: 'Rouge', accent: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e 0%, #9f1239 100%)' },
  gold: { name: 'Jaune', accent: '#fbbf24', gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }
};

function applyTheme(themeKey) {
  const theme = THEMES[themeKey] || THEMES.emerald;
  let styleEl = document.getElementById('wikimaster-theme-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'wikimaster-theme-styles';
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    :root {
      --color-accent: ${theme.accent} !important;
      --theme-gradient: ${theme.gradient} !important;
    }
    
    /* Boutons et éléments pleins avec le dégradé premium */
    button.bg-\\[var\\(--color-accent\\)\\]\\/90,
    button.bg-\\[var\\(--color-accent\\)\\],
    .bg-\\[var\\(--color-accent\\)\\] {
      background: var(--theme-gradient) !important;
      border-color: transparent !important;
    }
  `;
}

const BASE_THEMES = {
  darkBlack: { name: 'Noir foncé', bg: '#09090b', surface: '#18181b', surfaceLight: '#27272a', border: '#3f3f46', text: '#f4f4f5' },
  dark: { name: 'Noir', bg: '#121212', surface: '#1e1e1e', surfaceLight: '#2d2d2d', border: '#404040', text: '#e5e5e5' },
  light: { name: 'Blanc (Light mode)', bg: '#ffffff', surface: '#f4f4f5', surfaceLight: '#e4e4e7', border: '#d4d4d8', text: '#18181b' },
  cream: { name: 'Beige crème (Light mode)', bg: '#fdfbf7', surface: '#f3f0e6', surfaceLight: '#e8e4d9', border: '#d6d1c4', text: '#433829' },
  blue: { name: 'Bleu foncé', bg: '#0f172a', surface: '#1e293b', surfaceLight: '#334155', border: '#475569', text: '#f8fafc' }
};

function applyBaseTheme(baseKey) {
  const base = BASE_THEMES[baseKey] || BASE_THEMES.dark;
  let styleEl = document.getElementById('wikimaster-base-theme-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'wikimaster-base-theme-styles';
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    :root, .dark, body {
      --color-background: ${base.bg} !important;
      --color-surface: ${base.surface} !important;
      --color-surface-light: ${base.surfaceLight} !important;
      --color-border: ${base.border} !important;
      --color-foreground: ${base.text} !important;
      background-color: ${base.bg} !important;
      color: ${base.text} !important;
    }
    
    .card-frame {
      background-color: var(--color-surface) !important;
      border-color: var(--color-border) !important;
    }
    
    /* Boutons de log et divers éléments utilisant la surface-light */
    .bg-\\[var\\(--color-surface-light\\)\\] {
      background-color: var(--color-surface-light) !important;
    }
  `;
}

// =========================================================================
// ÉTAT GLOBAL & CACHE
// =========================================================================
let cachedHideMtx = false;
let isHideMtxLoaded = false;

if (chrome.runtime?.id) {
  chrome.storage.local.get({ hideMtx: false }, (res) => {
    cachedHideMtx = res.hideMtx;
    isHideMtxLoaded = true;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.hideMtx) {
      cachedHideMtx = changes.hideMtx.newValue;
      if (cachedHideMtx) removeMicroTransactions();
    }
  });
}

function injectOpenAllButton() {
  if (document.getElementById('wikimaster-open-all-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'wikimaster-open-all-btn';
  btn.innerText = 'Ouvrir Tout';
  btn.style.cssText = `
    padding: 12px 24px;
    background: var(--theme-gradient, var(--color-accent));
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
      btn.style.opacity = '0.85';
    }
  };

  btn.onmouseout = () => {
    if (!btn.disabled) {
      btn.style.opacity = '1';
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
    if (!chrome.runtime?.id) {
      observer.disconnect();
      return;
    }

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

                // Nettoyer les MTX à l'ouverture d'un paquet
                removeMicroTransactions();
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
    background: var(--theme-gradient, var(--color-accent));
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
      btn.style.opacity = '0.85';
    }
  };

  btn.onmouseout = () => {
    if (!btn.disabled) {
      btn.style.opacity = '1';
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
  if (document.getElementById('wikimaster-logs-container')) return;

  const maxWContainer = document.querySelector('.max-w-lg');
  if (!maxWContainer || !maxWContainer.querySelector('h1')?.innerText.includes('Paramètres')) return;

  // On ajoute une classe au <main> parent pour gérer le layout flex
  // Cela évite de créer un wrapper DOM supplémentaire qui fait crasher React
  const main = maxWContainer.parentElement;
  main.classList.add('wikimaster-settings-layout');

  // Injecter les styles spécifiques pour le layout
  if (!document.getElementById('wikimaster-logs-style')) {
    const style = document.createElement('style');
    style.id = 'wikimaster-logs-style';
    style.innerHTML = `
      .wikimaster-settings-layout {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: flex-start !important;
        width: 100% !important;
      }
      #wikimaster-logs-container {
        position: relative;
        width: 100%;
        min-height: 400px;
        margin-bottom: 24px;
        margin-right: 24px;
        margin-top: 84px;
      }
      @media (min-width: 1024px) {
        .wikimaster-settings-layout {
          flex-wrap: nowrap !important;
          padding-right: 24px;
        }
        #wikimaster-logs-container {
          width: 464px;
          min-height: 0;
          margin-bottom: 0;
        }
      }
      #wikimaster-logs-panel {
        max-height: 400px;
      }
    `;
    document.head.appendChild(style);
  }

  const panelContainer = document.createElement('div');
  panelContainer.id = 'wikimaster-logs-container';
  panelContainer.className = 'flex flex-col gap-6'; // Espace entre les options et la console

  // Panneau d'options (MTX)
  const optionsPanel = document.createElement('div');
  optionsPanel.id = 'wikimaster-options-panel';
  optionsPanel.className = 'card-frame p-5 animate-fade-in-up';
  optionsPanel.innerHTML = `
    <h3 class="text-sm font-semibold text-[var(--color-foreground)]/60 mb-4" style="font-family: var(--font-heading);">Bloqueur</h3>
    
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm text-[var(--color-foreground)]">Masquer les micro-transactions</p>
        <p class="text-xs text-[var(--color-foreground)]/40 mt-0.5">Cache l'encart WikiMasters PRO et autres offres</p>
      </div>
      <button id="wikimaster-toggle-mtx" role="switch" aria-checked="false" class="relative shrink-0 w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer focus:outline-none" style="background: var(--color-border);">
        <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300" style="transform: translateX(0px);"></span>
      </button>
    </div>
  `;

  let themeButtonsHTML = '';
  for (const [key, theme] of Object.entries(THEMES)) {
    themeButtonsHTML += `
      <button class="theme-selector-btn rounded-full w-8 h-8 cursor-pointer transition-all hover:scale-110" 
              data-theme="${key}" 
              style="background: ${theme.gradient}; border: none;" 
              title="${theme.name}">
      </button>
    `;
  }

  // Panneau d'options (Apparence - Native)
  let apparencePanel = Array.from(document.querySelectorAll('.card-frame')).find(el => {
    const h3 = el.querySelector('h3');
    return h3 && h3.textContent.trim() === 'Apparence';
  });

  let baseThemeButtonsHTML = '';
  for (const [key, base] of Object.entries(BASE_THEMES)) {
    baseThemeButtonsHTML += `
      <button class="base-theme-selector-btn rounded-full w-8 h-8 cursor-pointer transition-all hover:scale-110" 
              data-basetheme="${key}" 
              style="background: ${base.bg}; border: 1px solid ${base.border};" 
              title="${base.name}">
      </button>
    `;
  }

  const apparenceContent = `
    <h3 class="text-sm font-semibold text-[var(--color-foreground)]/60 mb-4" style="font-family: var(--font-heading);">Apparence</h3>
    <div class="flex flex-col gap-2">
      <p class="text-sm text-[var(--color-foreground)]">Couleurs de l'interface</p>
      <div class="flex items-center gap-3 mt-2" id="wikimaster-base-theme-list">
        ${baseThemeButtonsHTML}
      </div>
    </div>
    <div class="mt-4 border-t border-[var(--color-border)] pt-4">
      <div class="flex flex-col gap-2">
        <p class="text-sm text-[var(--color-foreground)]">Couleurs d'accentuation</p>
        <div class="flex items-center gap-3 mt-2" id="wikimaster-theme-list">
          ${themeButtonsHTML}
        </div>
      </div>
    </div>
  `;

  if (apparencePanel) {
    apparencePanel.id = 'wikimaster-apparence-panel';
    apparencePanel.innerHTML = apparenceContent;
  } else {
    // Fallback de sécurité
    apparencePanel = document.createElement('div');
    apparencePanel.id = 'wikimaster-apparence-panel';
    apparencePanel.className = 'card-frame p-5 animate-fade-in-up';
    apparencePanel.innerHTML = apparenceContent;
  }

  // Panneau d'options (Performances)
  const perfPanel = document.createElement('div');
  perfPanel.id = 'wikimaster-perf-panel';
  perfPanel.className = 'card-frame p-5 animate-fade-in-up';
  perfPanel.innerHTML = `
    <h3 class="text-sm font-semibold text-[var(--color-foreground)]/60 mb-4" style="font-family: var(--font-heading);">Performances</h3>
    
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm text-[var(--color-foreground)]">Désactiver les animations</p>
        <p class="text-xs text-[var(--color-foreground)]/40 mt-0.5">Supprime toutes les animations et transitions pour un rendu immédiat</p>
      </div>
      <button id="wikimaster-toggle-animations" role="switch" aria-checked="false" class="relative shrink-0 w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer focus:outline-none" style="background: var(--color-border);">
        <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300" style="transform: translateX(0px);"></span>
      </button>
    </div>
    
    <div class="flex items-center justify-between gap-4 mt-4">
      <div>
        <p class="text-sm text-[var(--color-foreground)]">Désactiver les images</p>
        <p class="text-xs text-[var(--color-foreground)]/40 mt-0.5">Remplace toutes les images (Pack, Cartes, Avatars) par le logo WikiMaster</p>
      </div>
      <button id="wikimaster-toggle-images" role="switch" aria-checked="false" class="relative shrink-0 w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer focus:outline-none" style="background: var(--color-border);">
        <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300" style="transform: translateX(0px);"></span>
      </button>
    </div>
  `;

  // Panneau d'options (Interface)
  const interfacePanel = document.createElement('div');
  interfacePanel.id = 'wikimaster-interface-panel';
  interfacePanel.className = 'card-frame p-5 animate-fade-in-up';
  interfacePanel.innerHTML = `
    <h3 class="text-sm font-semibold text-[var(--color-foreground)]/60 mb-4" style="font-family: var(--font-heading);">Interface</h3>
    
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm text-[var(--color-foreground)]">Amélioration du menu gauche</p>
        <p class="text-xs text-[var(--color-foreground)]/40 mt-0.5">Ajuste l'espacement pour que tout rentre dans l'écran sans défilement</p>
      </div>
      <button id="wikimaster-toggle-menu" role="switch" aria-checked="false" class="relative shrink-0 w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer focus:outline-none" style="background: var(--color-border);">
        <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300" style="transform: translateX(0px);"></span>
      </button>
    </div>
    
    <div class="flex items-center justify-between gap-4 mt-4">
      <div>
        <p class="text-sm text-[var(--color-foreground)]">Centrage du chargement</p>
        <p class="text-xs text-[var(--color-foreground)]/40 mt-0.5">Centre correctement l'animation lors des chargements de page</p>
      </div>
      <button id="wikimaster-toggle-loading" role="switch" aria-checked="false" class="relative shrink-0 w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer focus:outline-none" style="background: var(--color-border);">
        <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300" style="transform: translateX(0px);"></span>
      </button>
    </div>
  `;

  const panel = document.createElement('div');
  panel.id = 'wikimaster-logs-panel';
  panel.className = 'card-frame p-5 animate-fade-in-up flex-1';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.overflow = 'hidden';

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
    <div id="wikimaster-logs-content" class="text-xs font-mono space-y-2 flex-1 overflow-y-auto pr-2" style="color: var(--color-foreground); opacity: 0.8;"></div>
  `;

  panelContainer.appendChild(optionsPanel);
  panelContainer.appendChild(apparencePanel);
  panelContainer.appendChild(interfacePanel);
  panelContainer.appendChild(perfPanel);
  panelContainer.appendChild(panel);
  main.appendChild(panelContainer);

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
          content.innerHTML = logs.map(l => `<div style="padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:var(--color-accent);font-weight:bold;">[${l.time}]</span> ${l.msg}</div>`).join('');
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

  // Logique pour le toggle MTX
  const mtxBtn = document.getElementById('wikimaster-toggle-mtx');
  const mtxSpan = mtxBtn.querySelector('span');

  const updateMtxToggle = (isActive) => {
    mtxBtn.setAttribute('aria-checked', isActive.toString());
    if (isActive) {
      mtxBtn.style.background = 'var(--color-accent)';
      mtxSpan.style.transform = 'translateX(24px)';
    } else {
      mtxBtn.style.background = 'var(--color-border)';
      mtxSpan.style.transform = 'translateX(0px)';
    }
  };

  if (!chrome.runtime?.id) return;

  chrome.storage.local.get({ hideMtx: false }, (res) => {
    updateMtxToggle(res.hideMtx);
  });

  mtxBtn.addEventListener('click', () => {
    const currentState = mtxBtn.getAttribute('aria-checked') === 'true';
    const newState = !currentState;
    updateMtxToggle(newState);
    chrome.storage.local.set({ hideMtx: newState });

    if (newState) {
      removeMicroTransactions();
    } else {
      window.location.reload(); // Recharger la page pour restaurer les éléments cachés
    }
  });

  // Logique pour le toggle Menu
  const menuBtn = document.getElementById('wikimaster-toggle-menu');
  const menuSpan = menuBtn.querySelector('span');

  const updateMenuToggle = (isActive) => {
    menuBtn.setAttribute('aria-checked', isActive.toString());
    if (isActive) {
      menuBtn.style.background = 'var(--color-accent)';
      menuSpan.style.transform = 'translateX(24px)';
      document.body.classList.add('wikimaster-compact-menu');
    } else {
      menuBtn.style.background = 'var(--color-border)';
      menuSpan.style.transform = 'translateX(0px)';
      document.body.classList.remove('wikimaster-compact-menu');
    }
  };

  chrome.storage.local.get({ compactMenu: true }, (res) => {
    updateMenuToggle(res.compactMenu);
  });

  menuBtn.addEventListener('click', () => {
    const currentState = menuBtn.getAttribute('aria-checked') === 'true';
    const newState = !currentState;
    updateMenuToggle(newState);
    chrome.storage.local.set({ compactMenu: newState });
  });

  // Logique pour le toggle Animations
  const animBtn = document.getElementById('wikimaster-toggle-animations');
  const animSpan = animBtn.querySelector('span');

  const updateAnimToggle = (isActive) => {
    animBtn.setAttribute('aria-checked', isActive.toString());
    if (isActive) {
      animBtn.style.background = 'var(--color-accent)';
      animSpan.style.transform = 'translateX(24px)';
      document.body.classList.add('wikimaster-no-animations');
    } else {
      animBtn.style.background = 'var(--color-border)';
      animSpan.style.transform = 'translateX(0px)';
      document.body.classList.remove('wikimaster-no-animations');
    }
  };

  chrome.storage.local.get({ disableAnimations: false }, (res) => {
    updateAnimToggle(res.disableAnimations);
  });

  animBtn.addEventListener('click', () => {
    const currentState = animBtn.getAttribute('aria-checked') === 'true';
    const newState = !currentState;
    updateAnimToggle(newState);
    chrome.storage.local.set({ disableAnimations: newState });
  });

  // Logique pour le toggle Images
  const imgBtn = document.getElementById('wikimaster-toggle-images');
  const imgSpan = imgBtn.querySelector('span');

  const updateImgToggle = (isActive) => {
    imgBtn.setAttribute('aria-checked', isActive.toString());
    if (isActive) {
      imgBtn.style.background = 'var(--color-accent)';
      imgSpan.style.transform = 'translateX(24px)';
      document.body.classList.add('wikimaster-no-images');
    } else {
      imgBtn.style.background = 'var(--color-border)';
      imgSpan.style.transform = 'translateX(0px)';
      document.body.classList.remove('wikimaster-no-images');
    }
  };

  chrome.storage.local.get({ disableImages: false }, (res) => {
    updateImgToggle(res.disableImages);
  });

  imgBtn.addEventListener('click', () => {
    const currentState = imgBtn.getAttribute('aria-checked') === 'true';
    const newState = !currentState;
    updateImgToggle(newState);
    chrome.storage.local.set({ disableImages: newState }, () => {
      window.location.reload();
    });
  });

  // Logique pour le toggle Centrage Chargement
  const loadingBtn = document.getElementById('wikimaster-toggle-loading');
  const loadingSpan = loadingBtn.querySelector('span');

  const updateLoadingToggle = (isActive) => {
    loadingBtn.setAttribute('aria-checked', isActive.toString());
    if (isActive) {
      loadingBtn.style.background = 'var(--color-accent)';
      loadingSpan.style.transform = 'translateX(24px)';
      document.body.classList.add('wikimaster-center-loading');
    } else {
      loadingBtn.style.background = 'var(--color-border)';
      loadingSpan.style.transform = 'translateX(0px)';
      document.body.classList.remove('wikimaster-center-loading');
    }
  };

  chrome.storage.local.get({ centerLoading: true }, (res) => {
    updateLoadingToggle(res.centerLoading);
  });

  loadingBtn.addEventListener('click', () => {
    const currentState = loadingBtn.getAttribute('aria-checked') === 'true';
    const newState = !currentState;
    updateLoadingToggle(newState);
    chrome.storage.local.set({ centerLoading: newState });
  });

  // Logique pour les Thèmes
  const themeButtons = apparencePanel.querySelectorAll('.theme-selector-btn');
  const baseThemeButtons = apparencePanel.querySelectorAll('.base-theme-selector-btn');

  const updateThemeUI = (activeTheme) => {
    themeButtons.forEach(btn => {
      if (btn.dataset.theme === activeTheme) {
        btn.style.boxShadow = '0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-foreground)';
        btn.style.transform = 'scale(1.1)';
      } else {
        btn.style.boxShadow = 'none';
        btn.style.transform = 'scale(1)';
      }
    });
  };

  const updateBaseThemeUI = (activeBase) => {
    baseThemeButtons.forEach(btn => {
      if (btn.dataset.basetheme === activeBase) {
        btn.style.boxShadow = '0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent)';
        btn.style.transform = 'scale(1.1)';
      } else {
        btn.style.boxShadow = 'none';
        btn.style.transform = 'scale(1)';
      }
    });
  };

  chrome.storage.local.get({ baseTheme: 'dark', theme: 'emerald' }, (res) => {
    updateBaseThemeUI(res.baseTheme);
    updateThemeUI(res.theme);
  });

  baseThemeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selectedBase = e.currentTarget.dataset.basetheme;
      chrome.storage.local.set({ baseTheme: selectedBase }, () => {
        updateBaseThemeUI(selectedBase);
        applyBaseTheme(selectedBase);
        // Réappliquer le focus UI complet car les variables ont changé
        updateThemeUI(document.querySelector('.theme-selector-btn[style*="scale(1.1)"]')?.dataset.theme || 'emerald');
      });
    });
  });

  themeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selectedTheme = e.currentTarget.dataset.theme;
      chrome.storage.local.set({ theme: selectedTheme }, () => {
        updateThemeUI(selectedTheme);
        applyTheme(selectedTheme); // Application immédiate
        // Réappliquer le focus UI du base theme car l'accent a changé
        updateBaseThemeUI(document.querySelector('.base-theme-selector-btn[style*="scale(1.1)"]')?.dataset.basetheme || 'dark');
      });
    });
  });
}

let mtxTimeout = null;

function removeMicroTransactions() {
  if (!isHideMtxLoaded || !cachedHideMtx) return;

  // Debounce pour ne pas surcharger le navigateur à chaque mutation React
  if (mtxTimeout) return;
  mtxTimeout = setTimeout(() => {
    mtxTimeout = null;
    executeMtxRemoval();
  }, 100);
}

function executeMtxRemoval() {
  const mtxKeywords = [
    'wikimasters pro',
    "s'abonner",
    "s’abonner",
    'acheter des wikibidous',
    'rechargez',
    'stripe'
  ];

  // Détecte les prix en argent réel (ex: 1,99 $, 4.99€, 9,99 $ CAD)
  const priceRegex = /\d+[.,]\d+\s*(?:\$|€|cad|usd)/i;

  // On cherche dans tous les conteneurs potentiels
  const containers = Array.from(document.querySelectorAll('div, section, article, aside, li, button, a'));
  const majorMtxNodes = [];
  const smallMtxNodes = [];

  for (let el of containers) {
    if (el.id === 'wikimaster-options-panel' || el.closest('#wikimaster-options-panel')) continue;

    const text = el.textContent ? el.textContent.toLowerCase() : '';
    // On ignore les conteneurs géants (ex: la page entière) pour éviter de tout cacher
    if (!text || text.length > 2500) continue;

    // Détection d'une boîte MTX majeure (Titre + Info de paiement ou mots-clés forts)
    const hasTitle = text.includes('wikimasters pro') || text.includes('acheter des wikibidous');
    const hasPrice = priceRegex.test(text) || text.includes('stripe') || text.includes("s'abonner") || text.includes("s’abonner") || text.includes('non-remboursables');

    if (hasTitle && hasPrice) {
      majorMtxNodes.push(el);
    } else {
      // Détection d'un petit élément MTX isolé (ex: bouton "Rechargez 10 paquets - 1,99 $")
      if (text.trim().length < 150 && (priceRegex.test(text) || text.includes('rechargez '))) {
        smallMtxNodes.push(el);
      }
    }
  }

  // Pour les GROSSES boîtes (PRO, Boutique), on cherche le conteneur le PLUS PROFOND qui contient TOUT (Titre + Prix)
  // Ainsi, le script trouve la boîte exacte de l'offre et ne remonte JAMAIS jusqu'à la page entière !
  const deepestMajorNodes = majorMtxNodes.filter(el => {
    return !majorMtxNodes.some(other => other !== el && el.contains(other));
  });

  for (let el of deepestMajorNodes) {
    // On remonte pour trouver la "coquille" de la carte (qui contient les bordures et les ombres)
    let toHide = el.closest('section') ||
      el.closest('.card-frame') ||
      el.closest('[class*="shadow"]') ||
      el.closest('[class*="border"]') ||
      el;

    // SÉCURITÉ ANTI-ÉCRAN NOIR : on s'assure de ne pas cacher la page entière
    if (toHide.tagName.toLowerCase() === 'main' || toHide.tagName.toLowerCase() === 'body' || (toHide.textContent && toHide.textContent.length > 2500)) {
      toHide = el;
    }

    if (toHide && toHide.style.display !== 'none') {
      toHide.style.display = 'none';
    }
  }

  // Pour les PETITS boutons isolés, on garde le conteneur le PLUS PROFOND
  // Cela permet de ne cacher que le bouton sans cacher son parent
  const deepestSmallNodes = smallMtxNodes.filter(el => {
    return !smallMtxNodes.some(other => other !== el && el.contains(other));
  });

  for (let el of deepestSmallNodes) {
    const toHide = el.closest('button') || el.closest('a') || el.closest('li') || el;
    if (toHide && toHide.style.display !== 'none') {
      toHide.style.display = 'none';
    }
  }
}

function injectVolumeSlider() {
  if (document.getElementById('wikimaster-volume-slider-container')) return;

  const h3s = Array.from(document.querySelectorAll('h3'));
  const sonH3 = h3s.find(h => h.innerText.trim() === 'Son');
  if (!sonH3) return;

  const container = sonH3.parentElement;

  const sliderContainer = document.createElement('div');
  sliderContainer.id = 'wikimaster-volume-slider-container';
  sliderContainer.className = 'mt-5 pt-4 border-t border-[var(--color-border)] animate-fade-in-up';

  sliderContainer.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <div class="flex flex-col">
        <span class="text-sm text-[var(--color-foreground)]">Volume des effets</span>
        <span class="text-xs text-[var(--color-foreground)]/40 mt-0.5">Ajuste le volume d'ouverture des paquets</span>
      </div>
      <span id="wikimaster-volume-value" class="text-sm font-bold" style="color: var(--color-accent);">100%</span>
    </div>
    <input type="range" id="wikimaster-volume-slider" min="0" max="100" value="100" class="w-full cursor-pointer" style="accent-color: var(--color-accent);">
  `;

  if (!document.getElementById('wikimaster-volume-style')) {
    const style = document.createElement('style');
    style.id = 'wikimaster-volume-style';
    style.innerHTML = `
      #wikimaster-volume-slider {
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        border-radius: 99px;
        background: var(--color-surface-light);
        outline: none;
      }
      #wikimaster-volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--color-accent);
        cursor: pointer;
        border: 2px solid var(--color-surface);
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
      }
      #wikimaster-volume-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--color-accent);
        cursor: pointer;
        border: 2px solid var(--color-surface);
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(sliderContainer);

  const slider = document.getElementById('wikimaster-volume-slider');
  const valueDisplay = document.getElementById('wikimaster-volume-value');

  if (!chrome.runtime?.id) return;

  const updateSliderBg = (val) => {
    slider.style.background = `linear-gradient(to right, var(--color-accent) ${val}%, var(--color-surface-light) ${val}%)`;
  };

  chrome.storage.local.get({ volume: 100 }, (result) => {
    slider.value = result.volume;
    valueDisplay.innerText = result.volume + '%';
    updateSliderBg(result.volume);
  });

  slider.addEventListener('input', (e) => {
    const val = e.target.value;
    valueDisplay.innerText = val + '%';
    updateSliderBg(val);
    window.dispatchEvent(new CustomEvent('wikimaster-volume-change', { detail: { volume: val / 100 } }));
    chrome.storage.local.set({ volume: parseInt(val, 10) });
  });
}

// Initialisation
function init() {
  // Injecter les styles CSS pour l'animation s'ils ne sont pas déjà là
  if (!document.getElementById('wikimaster-styles')) {
    const style = document.createElement('style');
    style.id = 'wikimaster-styles';
    style.innerHTML = `
      @keyframes wikimaster-spin { 100% { transform: rotate(360deg); } }
      
      /* Amélioration de l'interface : forcer le menu de gauche (sidebar) à prendre tout l'écran sans scroll */
      body.wikimaster-compact-menu nav.w-64 {
        height: 100vh !important;
        height: 100dvh !important;
        position: sticky !important;
        top: 0 !important;
        padding: 1.25rem !important; /* Réduit le padding global (p-6) */
        gap: 0.25rem !important;
        justify-content: space-between !important;
        overflow-y: hidden !important; /* Empêche formellement le scroll */
      }

      /* Réduire la marge sous le logo pour laisser plus de place */
      body.wikimaster-compact-menu nav.w-64 .mb-8 {
        margin-bottom: 0 !important; 
      }

      /* Rendre les onglets flexibles pour s'adapter à toutes les hauteurs d'écran */
      body.wikimaster-compact-menu nav.w-64 a {
        flex: 1 1 0% !important;
        max-height: 3rem !important;
        min-height: 2rem !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }

      /* Centrer verticalement le cercle de chargement de la page */
      body.wikimaster-center-loading main:has(> .flex-1.flex.items-center.justify-center > .animate-spin) {
        display: flex !important;
        flex-direction: column !important;
      }

      /* Désactiver toutes les animations */
      body.wikimaster-no-animations *,
      body.wikimaster-no-animations *::before,
      body.wikimaster-no-animations *::after {
        animation: none !important;
        transition: none !important;
      }

      /* Diviser par 2 la taille du logo sur les boosters */
      body.wikimaster-no-images img[alt="Ouvrir un paquet"] {
        width: 128px !important;
        height: 128px !important;
        margin-inline: auto !important;
      }
      
      /* Cacher l'image de fond principale des cartes pour voir la couleur de rareté */
      body.wikimaster-no-images .glow-c > img:not([alt="Ouvrir un paquet"]),
      body.wikimaster-no-images .glow-pc > img:not([alt="Ouvrir un paquet"]),
      body.wikimaster-no-images .glow-r > img:not([alt="Ouvrir un paquet"]),
      body.wikimaster-no-images .glow-sr > img:not([alt="Ouvrir un paquet"]),
      body.wikimaster-no-images .glow-ur > img:not([alt="Ouvrir un paquet"]),
      body.wikimaster-no-images .glow-l > img:not([alt="Ouvrir un paquet"]),
      body.wikimaster-no-images .glow-m > img:not([alt="Ouvrir un paquet"]) {
        display: none !important;
      }
      
      /* Couleurs de fond dynamiques des parties internes de la carte selon la rareté */
      body.wikimaster-no-images .glow-c > div.top-0, body.wikimaster-no-images .glow-c > div.top-\\[45\\%\\] { background-color: color-mix(in srgb, var(--color-rarity-c) 40%, transparent) !important; }
      body.wikimaster-no-images .glow-pc > div.top-0, body.wikimaster-no-images .glow-pc > div.top-\\[45\\%\\] { background-color: color-mix(in srgb, var(--color-rarity-pc) 40%, transparent) !important; }
      body.wikimaster-no-images .glow-r > div.top-0, body.wikimaster-no-images .glow-r > div.top-\\[45\\%\\] { background-color: color-mix(in srgb, var(--color-rarity-r) 40%, transparent) !important; }
      body.wikimaster-no-images .glow-sr > div.top-0, body.wikimaster-no-images .glow-sr > div.top-\\[45\\%\\] { background-color: color-mix(in srgb, var(--color-rarity-sr) 40%, transparent) !important; }
      body.wikimaster-no-images .glow-ur > div.top-0, body.wikimaster-no-images .glow-ur > div.top-\\[45\\%\\] { background-color: color-mix(in srgb, var(--color-rarity-ur) 40%, transparent) !important; }
      body.wikimaster-no-images .glow-l > div.top-0, body.wikimaster-no-images .glow-l > div.top-\\[45\\%\\] { background-color: color-mix(in srgb, var(--color-rarity-l) 40%, transparent) !important; }

      body.wikimaster-no-images video {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Le hook de volume (volume_hook.js) est désormais injecté automatiquement 
  // via le manifest.json dans le "MAIN world" pour respecter la CSP du site.
  // On envoie simplement la valeur sauvegardée initiale au hook :
  chrome.storage.local.get({ volume: 100, compactMenu: true, centerLoading: true, disableAnimations: false, disableImages: false, theme: 'emerald', baseTheme: 'dark' }, (result) => {
    window.dispatchEvent(new CustomEvent('wikimaster-volume-change', { detail: { volume: result.volume / 100 } }));

    // Activer l'amélioration du menu si l'option est activée (par défaut)
    if (result.compactMenu) {
      document.body.classList.add('wikimaster-compact-menu');
    }

    // Activer le centrage du chargement si l'option est activée (par défaut)
    if (result.centerLoading) {
      document.body.classList.add('wikimaster-center-loading');
    }

    // Désactiver les animations
    if (result.disableAnimations) {
      document.body.classList.add('wikimaster-no-animations');
    }

    // Désactiver les images
    if (result.disableImages) {
      document.body.classList.add('wikimaster-no-images');
      
      const logoUrl = chrome.runtime.getURL('assets/wikimaster.webp');
      const replaceImg = (img) => {
        // Ignorer l'image de fond principale de la carte (qui est gérée par le display:none en CSS)
        // et remplacer toutes les autres par le logo.
        if (img.src !== logoUrl && !img.closest('.glow-c > img, .glow-pc > img, .glow-r > img, .glow-sr > img, .glow-ur > img, .glow-l > img, .glow-m > img')) {
          img.dataset.origSrc = img.src;
          img.dataset.origSrcset = img.srcset || '';
          img.src = logoUrl;
          img.removeAttribute('srcset');
        }
      };

      document.querySelectorAll('img').forEach(replaceImg);

      const imgObserver = new MutationObserver((mutations) => {
        for (const mut of mutations) {
          for (const node of mut.addedNodes) {
            if (node.nodeType === 1) {
              if (node.tagName === 'IMG') replaceImg(node);
              else node.querySelectorAll('img').forEach(replaceImg);
            }
          }
        }
      });
      imgObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Appliquer les thèmes
    applyBaseTheme(result.baseTheme);
    applyTheme(result.theme);
  });

  // L'URL peut changer dynamiquement et React/Next.js re-rend le DOM fréquemment.
  // On utilise un observer global pour s'assurer que le bouton reste présent et à jour.
  const observer = new MutationObserver((mutations) => {
    if (!chrome.runtime?.id) {
      observer.disconnect();
      return;
    }

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
      injectVolumeSlider();
    } else {
      const panel = document.getElementById('wikimaster-logs-container');
      if (panel) {
        const p = document.getElementById('wikimaster-logs-panel');
        if (p && p.dataset.intervalId) clearInterval(Number(p.dataset.intervalId));
        panel.remove();
      }
      const main = document.querySelector('.wikimaster-settings-layout');
      if (main) main.classList.remove('wikimaster-settings-layout');
    }

    // DETECTEUR LEGER MTX : On vérifie si un noeud ajouté contient des mots-clés MTX
    if (cachedHideMtx) {
      let mtxTriggered = false;
      for (let mutation of mutations) {
        for (let node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.textContent ? node.textContent.toLowerCase() : '';
            if (
              text.includes('wikimasters pro') ||
              text.includes('wikibidous') ||
              text.includes('rechargez') ||
              text.includes('s\'abonner') ||
              text.includes('s’abonner')
            ) {
              mtxTriggered = true;
              break;
            }
          }
        }
        if (mtxTriggered) break;
      }

      if (mtxTriggered) {
        removeMicroTransactions();
      }
    }
  });

  observer.observe(document.body, { subtree: true, childList: true });

  // STRATÉGIE MTX OPTIMISÉE : Au lieu de scanner la page à chaque changement (gourmand),
  // on utilise des déclencheurs ciblés comme demandé.

  // 1. Au lancement initial
  removeMicroTransactions();

  // 2. Changement de page / onglet (SPA)
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      removeMicroTransactions();
    }
  }, 1000);

  // 3. Ouverture de la boutique (clic sur le bouton WikiBidous ou n'importe quel lien)
  document.addEventListener('click', (e) => {
    if (!cachedHideMtx) return;
    const isShopButton = e.target.closest('button[aria-label="Ouvrir la boutique WikiBidous"]');
    const isNavigation = e.target.closest('a');

    if (isShopButton || isNavigation) {
      // La page ou la modale va s'afficher, on lance le nettoyeur plusieurs fois
      setTimeout(removeMicroTransactions, 50);
      setTimeout(removeMicroTransactions, 500);
      setTimeout(removeMicroTransactions, 1200);
    }
  });

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
