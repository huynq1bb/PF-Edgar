(function () {
  const block = document.querySelector("[data-cross-sell]");
  if (!block) return;

  const shop = block.getAttribute("data-shop");
  const productId = block.getAttribute("data-product-id");
  const apiBase = (block.getAttribute("data-api-base") || "").replace(/\/$/, "");
  const listEl = block.querySelector("[data-recommendations]");
  const addAllWrap = block.querySelector("[data-add-all-wrap]");
  const addAllBtn = block.querySelector("[data-add-all]");

  if (!shop || !productId || !listEl) return;

  const apiUrl =
    apiBase +
    "/api/cross-sell/recommend?shop=" +
    encodeURIComponent(shop) +
    "&product_id=" +
    encodeURIComponent(productId);

  listEl.innerHTML = '<span class="cross-sell-block__loading">Loading…</span>';

  fetch(apiUrl, { method: "GET" })
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      const products = data.products || [];
      if (products.length === 0) {
        block.style.display = "none";
        return;
      }
      listEl.innerHTML = "";
      products.forEach(function (p) {
        const card = document.createElement("div");
        card.className = "cross-sell-block__card";
        card.innerHTML =
          (p.imageUrl
            ? '<img class="cross-sell-block__card-image" src="' +
              escapeHtml(p.imageUrl) +
              '" alt="" loading="lazy">'
            : '<div class="cross-sell-block__card-image" style="background:#f0f0f0;"></div>') +
          '<div class="cross-sell-block__card-body">' +
          '<div class="cross-sell-block__card-title">' +
          escapeHtml(p.title) +
          "</div>" +
          '<div class="cross-sell-block__card-price">' +
          escapeHtml(formatMoney(p.price)) +
          "</div>" +
          '<button type="button" class="cross-sell-block__card-add" data-variant-id="' +
          escapeHtml(p.variantId) +
          '">Add to cart</button>' +
          "</div>";
        listEl.appendChild(card);
      });
      if (addAllWrap) addAllWrap.style.display = "block";

      listEl.querySelectorAll("[data-variant-id]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          addVariantToCart(btn.getAttribute("data-variant-id"), 1);
        });
      });
      if (addAllBtn) {
        addAllBtn.addEventListener("click", function () {
          addAllBtn.disabled = true;
          addAllBtn.textContent = "Adding…";
          var i = 0;
          function next() {
            if (i >= products.length) {
              addAllBtn.disabled = false;
              addAllBtn.textContent = addAllBtn.getAttribute("data-label") || "Thêm tất cả vào giỏ";
              if (typeof window.dispatchEvent === "function") {
                window.dispatchEvent(new CustomEvent("cart:refresh"));
              }
              return;
            }
            addVariantToCart(products[i].variantId, 1).then(next, next);
            i++;
          }
          next();
        });
      }
    })
    .catch(function () {
      block.style.display = "none";
    });

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function formatMoney(amount) {
    var n = parseFloat(amount, 10);
    return isNaN(n) ? amount : "¥" + n.toFixed(2);
  }

  function addVariantToCart(variantId, quantity) {
    return fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: variantId, quantity: quantity || 1 }],
      }),
    }).then(function (res) {
      if (!res.ok) return res.json().then(function (e) { throw new Error(e.description || "Add to cart failed"); });
      return res.json();
    });
  }
})();
