# WikiMaster Addons

**WikiMaster Addons** is a browser extension that enhances your gaming experience on [Wiki-Masters](https://www.wiki-masters.com). It provides automated features to save you time and helps you track your stats.

## ✨ Fonctionnalités (Features)

- **Auto-Opener ("Ouvrir Tout")** : Ajoute un bouton intelligent sur la page d'ouverture des paquets (`/pulls`). Un seul clic permet d'ouvrir tous vos paquets à la suite, vous évitant de cliquer manuellement des dizaines de fois.
- **Auto-Claim Achievements ("Tout réclamer")** : Ajoute un bouton sur la page des succès (`/achievements`) pour réclamer toutes vos récompenses débloquées en une seule action.
- **Bloqueur de Micro-transactions (MTX Blocker)** : Désintègre automatiquement les offres "WikiMasters PRO", les boutiques de "WikiBidous" et les boutons d'achat en argent réel de l'interface du jeu. L'algorithme scanne et nettoie la page en temps réel. Activable depuis les paramètres.
- **Contrôle du Volume (Volume Control)** : Ajoute un curseur de volume exclusif dans la page des paramètres (`/settings`) pour baisser ou couper les effets sonores assourdissants lors de l'ouverture des paquets.
- **Smart Polling & Anti-Spam** : Le script détecte dynamiquement les éléments à l'écran et intègre des pauses de sécurité intelligentes (ex: 1.5s entre chaque paquet) pour éviter de déclencher l'erreur "Opening too fast" du jeu.
- **Console de Débogage & Options Intégrées** : Ajoute un panneau de contrôle (UI) magnifique et natif dans la page des paramètres du jeu (`/settings`). Permet de gérer le bloqueur MTX et d'afficher, copier ou effacer les logs de l'extension en direct.

## 🛠 Installation

To install this extension on Google Chrome (or any Chromium-based browser):

1. Download or clone this repository to your computer.
2. Open your browser and go to the extensions page: `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right corner).
4. Click on **Load unpacked**.
5. Select the folder containing the extension files (`WikimasterAddons/extension/`).
6. You're all set! The extension icon will appear in your toolbar.

## 🎮 Utilisation

1. **Ouverture de paquets** : Allez sur la page `/pulls`. Un grand bouton vert **"Ouvrir Tout"** apparaîtra sous vos paquets. Cliquez dessus et laissez la magie opérer !
2. **Récupération des succès** : Allez sur la page `/achievements` pour voir le bouton **"Tout réclamer"**.
3. **Paramètres et Options** : Allez sur la page `/settings` pour :
   - Régler le volume des effets sonores du jeu avec précision.
   - Activer ou désactiver le **Bloqueur de Micro-transactions** en un clic.
   - Consulter la **Console Wikimaster** (logs en direct).

## 👨‍💻 Tech Stack

- Modern HTML5 / CSS3 (Flexbox, CSS Variables, Native Animations)
- Vanilla JavaScript (ES6, MutationObserver)
- Chrome Extension API (`chrome.storage.local`, `content_scripts`)
