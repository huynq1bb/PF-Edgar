(function () {
  const block = document.querySelector('[data-virtual-try-on]');
  if (!block) return;

  const trigger = block.querySelector('[data-try-on-trigger]');
  const placeholder = block.querySelector('[data-try-on-placeholder]');

  if (trigger && placeholder) {
    trigger.addEventListener('click', function () {
      placeholder.setAttribute('aria-hidden', 'false');
      // TODO: mở modal/form nhập chỉ số + chọn sản phẩm, gọi API Try-On
    });
  }
})();

(function () {
  const block = document.querySelector("[data-size-predict]");
  if (!block) return;

  const form = block.querySelector("[data-size-predict-form]");
  const resultEl = block.querySelector("[data-size-predict-result]");
  const messageEl = block.querySelector("[data-size-predict-message]");
  const errorEl = block.querySelector("[data-size-predict-error]");
  const errorTextEl = block.querySelector("[data-size-predict-error-text]");
  const submitBtn = block.querySelector("[data-size-predict-submit]");

  if (!form || !resultEl || !messageEl || !errorEl || !errorTextEl) return;

  function showResult(size, confidence) {
    errorEl.setAttribute("aria-hidden", "true");
    errorTextEl.textContent = "";
    resultEl.setAttribute("aria-hidden", "false");
    messageEl.textContent =
      "Size " +
      size +
      " fits you with " +
      Math.round(confidence) +
      "% confidence.";
    tryPreselectVariant(size);
  }

  function tryPreselectVariant(size) {
    if (!size) return;
    var productForm = document.querySelector("form[action*='/cart/add']") || document.querySelector("[data-product-form]");
    if (!productForm) return;
    var normalized = String(size).trim().toUpperCase();
    var select = productForm.querySelector("select[name*='option'], select[data-option-position]");
    if (select) {
      for (var i = 0; i < select.options.length; i++) {
        var opt = select.options[i];
        if (String(opt.value).trim().toUpperCase() === normalized || String(opt.text).trim().toUpperCase() === normalized) {
          select.value = opt.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          return;
        }
      }
    }
    var radios = productForm.querySelectorAll("input[type='radio'][name*='option'], input[type='radio'][data-option]");
    for (var j = 0; j < radios.length; j++) {
      var r = radios[j];
      if (String(r.value).trim().toUpperCase() === normalized || (r.getAttribute("data-value") && String(r.getAttribute("data-value")).trim().toUpperCase() === normalized)) {
        r.checked = true;
        r.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }
  }

  function showError(text) {
    resultEl.setAttribute("aria-hidden", "true");
    messageEl.textContent = "";
    errorEl.setAttribute("aria-hidden", "false");
    errorTextEl.textContent = text || "Something went wrong. Try again.";
  }

  function setLoading(loading) {
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.setAttribute("aria-busy", loading ? "true" : "false");
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var height = form.querySelector('[name="height"]').value;
    var weight = form.querySelector('[name="weight"]').value;
    if (!height || !weight) {
      showError("Please enter height and weight.");
      return;
    }

    setLoading(true);
    showError("");
    showResult("", 0);
    messageEl.textContent = "…";

    var proxyPath = "/apps/size-predict";
    var body = new FormData();
    body.append("height", height);
    body.append("weight", weight);

    fetch(proxyPath, {
      method: "POST",
      body: body,
      credentials: "same-origin",
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            throw new Error(data.error || "Request failed");
          }
          return data;
        });
      })
      .then(function (data) {
        if (data.size != null && data.confidence != null) {
          showResult(data.size, data.confidence);
        } else {
          showError(data.error || "No suggestion available.");
        }
      })
      .catch(function (err) {
        showError(err.message || "Could not get size suggestion.");
      })
      .finally(function () {
        setLoading(false);
      });
  });
})();
