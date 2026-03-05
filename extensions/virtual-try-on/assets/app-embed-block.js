(function () {
  const embed = document.querySelector('[data-virtual-try-on-embed]');
  if (!embed) return;

  const toggle = embed.querySelector('[data-embed-toggle]');
  if (toggle) {
    toggle.addEventListener('click', function () {
      embed.setAttribute('aria-hidden', 'false');
      // TODO: mở UI thử đồ (modal/drawer)
    });
  }
})();
