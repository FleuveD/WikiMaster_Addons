const RULE_ID = 1;

const blockImagesRule = {
  id: RULE_ID,
  priority: 1,
  action: { type: 'block' },
  condition: {
    initiatorDomains: ['wikimaster.com', 'wiki-masters.com', 'localhost'],
    urlFilter: "http*://*",
    resourceTypes: ['image', 'media']
  }
};

function updateImageBlockingRule(isEnabled) {
  if (isEnabled) {
    chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [blockImagesRule],
      removeRuleIds: [RULE_ID]
    });
    console.log("Image blocking rule enabled");
  } else {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID]
    });
    console.log("Image blocking rule disabled");
  }
}

// Initialiser l'état au démarrage de l'extension
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get({ disableImages: false }, (result) => {
    updateImageBlockingRule(result.disableImages);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ disableImages: false }, (result) => {
    updateImageBlockingRule(result.disableImages);
  });
});

// Écouter les changements dans le stockage local
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.disableImages !== undefined) {
    updateImageBlockingRule(changes.disableImages.newValue);
  }
});
