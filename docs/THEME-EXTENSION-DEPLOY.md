# Theme App Extension – Virtual Try-On – Deploy

## Đã tạo

- **Extension:** `extensions/virtual-try-on/`
- **App block:** “Virtual Try-On” – thêm vào section (ví dụ trang product).
- **App embed:** “Virtual Try-On (Embed)” – nút floating, bật trong App embeds.

Build đã chạy thành công (`shopify app build`). Để **deploy** cần chạy lệnh trong terminal (có đăng nhập Shopify).

## Deploy lên Shopify

1. **Đăng nhập (nếu chưa):**
   ```bash
   cd /Users/mac/Documents/Pagefly/local-app-ai-founder
   shopify auth login --store your-dev-store.myshopify.com
   ```

2. **Deploy app (gồm theme extension):**
   ```bash
   shopify app deploy
   ```
   Hoặc deploy không hỏi xác nhận:
   ```bash
   shopify app deploy --force
   ```

3. **(Tùy chọn)** Tạo version nhưng chưa release:
   ```bash
   shopify app deploy --no-release
   ```

Sau khi deploy, merchant có thể:

- **App block:** Vào Theme editor → thêm block “Virtual Try-On” vào section (ví dụ main product).
- **App embed:** Vào Theme settings → App embeds → bật “Virtual Try-On (Embed)”.

## Cấu trúc extension

```
extensions/virtual-try-on/
├── shopify.extension.toml
├── package.json
├── assets/
│   ├── app-block.css
│   ├── app-block.js
│   ├── app-embed-block.css
│   └── app-embed-block.js
├── blocks/
│   ├── app-block.liquid      # Block cho section (product page)
│   └── app-embed-block.liquid # Embed toàn store
└── locales/
    ├── en.default.json
    └── en.default.schema.json
```
