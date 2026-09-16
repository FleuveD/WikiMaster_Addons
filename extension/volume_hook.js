// Ce script s'exécute dans le monde principal (MAIN world) pour contourner la CSP
// et pouvoir surcharger les méthodes natives de la page.
window.wikimasterGlobalVolume = 1.0;

const originalPlay = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function() {
  this.volume = window.wikimasterGlobalVolume;
  return originalPlay.apply(this, arguments);
};

// Hook Web Audio API (utilisé par howler.js, use-sound, etc.)
const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
if (OriginalAudioContext) {
  const originalCreateGain = OriginalAudioContext.prototype.createGain;
  OriginalAudioContext.prototype.createGain = function() {
    const gainNode = originalCreateGain.apply(this, arguments);
    
    // Intercepter gainNode.gain.setValueAtTime
    const originalSetValueAtTime = gainNode.gain.setValueAtTime;
    gainNode.gain.setValueAtTime = function(value, startTime) {
      return originalSetValueAtTime.call(this, value * window.wikimasterGlobalVolume, startTime);
    };

    // Intercepter l'assignation directe gainNode.gain.value = X
    const gainParam = gainNode.gain;
    const originalValueSetter = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
    if (originalValueSetter && originalValueSetter.set) {
      Object.defineProperty(gainParam, 'value', {
        get: function() { return this._lastValue !== undefined ? this._lastValue : originalValueSetter.get.call(this); },
        set: function(val) {
          this._lastValue = val;
          originalValueSetter.set.call(this, val * window.wikimasterGlobalVolume);
        }
      });
    }

    return gainNode;
  };
}

// Mettre à jour en temps réel si des sons sont déjà en cours
window.addEventListener('wikimaster-volume-change', (e) => {
  window.wikimasterGlobalVolume = e.detail.volume;
});
