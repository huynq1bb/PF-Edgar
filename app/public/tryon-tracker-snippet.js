/**
 * Try-On Performance Analytics – storefront tracker snippet
 *
 * Include this script on your storefront (e.g. theme or app block) and call
 * the functions when your try-on widget fires the corresponding events.
 *
 * Usage:
 *   TryOnTracker.init('https://your-app-url.com', 'your-store.myshopify.com');
 *   TryOnTracker.tryOnStarted({ productId, productTitle, sessionId });
 *   TryOnTracker.tryOnCompleted({ productId, productTitle, sessionId });
 *   TryOnTracker.addToCartAfterTryOn({ productId, productTitle, sessionId });
 */

(function () {
  var appUrl = "";
  var shop = "";

  function getOrCreateSessionId() {
    var key = "tryon_session_id";
    try {
      var id = sessionStorage.getItem(key);
      if (!id) {
        id = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11);
        sessionStorage.setItem(key, id);
      }
      return id;
    } catch (e) {
      return "s_" + Date.now();
    }
  }

  function send(eventType, payload) {
    if (!appUrl || !shop) {
      console.warn("[TryOn Analytics] init() not called with appUrl and shop");
      return;
    }
    var body = {
      shop: shop,
      eventType: eventType,
      productId: payload.productId || null,
      productTitle: payload.productTitle || null,
      sessionId: payload.sessionId || getOrCreateSessionId(),
    };
    fetch(appUrl + "/api/tryon/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(function (err) {
      console.warn("[TryOn Analytics] send failed", err);
    });
  }

  window.TryOnTracker = {
    init: function (baseAppUrl, shopDomain) {
      appUrl = (baseAppUrl || "").replace(/\/$/, "");
      shop = (shopDomain || "").trim();
    },
    tryOnStarted: function (payload) {
      send("try_on_started", payload || {});
    },
    tryOnCompleted: function (payload) {
      send("try_on_completed", payload || {});
    },
    addToCartAfterTryOn: function (payload) {
      send("add_to_cart_after_try_on", payload || {});
    },
  };
})();
