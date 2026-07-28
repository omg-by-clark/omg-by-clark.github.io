function fitEmbedded2048() {
  var container = document.querySelector(".container");
  if (!container) return;

  var maxScale = 1;
  var framePadding = 14;
  var naturalHeight = container.scrollHeight || 680;
  var naturalWidth = container.scrollWidth || 500;
  var heightScale = (window.innerHeight - framePadding) / naturalHeight;
  var widthScale = (window.innerWidth - framePadding) / naturalWidth;
  var scale = Math.max(0.55, Math.min(maxScale, heightScale, widthScale));
  document.documentElement.style.setProperty("--omg-embed-scale", scale.toFixed(3));
}

window.addEventListener("resize", fitEmbedded2048);
window.addEventListener("load", fitEmbedded2048);
window.fitEmbedded2048 = fitEmbedded2048;

// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  fitEmbedded2048();
  window.gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
  window.requestAnimationFrame(fitEmbedded2048);
});
