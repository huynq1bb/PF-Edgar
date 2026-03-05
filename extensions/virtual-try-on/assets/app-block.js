(function () {
  const block = document.querySelector('[data-virtual-try-on]');
  if (!block) return;

  const trigger = block.querySelector('[data-try-on-trigger]');
  const placeholder = block.querySelector('[data-try-on-placeholder]');

  if (trigger) {
    trigger.addEventListener('click', function () {
      if (placeholder) {
        placeholder.setAttribute('aria-hidden', 'false');
      }
      // TODO: mở modal/form nhập chỉ số + chọn sản phẩm, gọi API Try-On
    });
  }
})();
