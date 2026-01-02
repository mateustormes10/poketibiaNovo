// GraphicsSettings.js
export const GraphicsSettings = {
  quality: 'alta', // 'baixa', 'media', 'alta'
  setQuality(q) {
    this.quality = q;
    if (typeof window !== 'undefined' && window.applyGraphicsQuality) {
      window.applyGraphicsQuality(q);
    }
  }
};
