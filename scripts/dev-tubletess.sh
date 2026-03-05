#!/usr/bin/env bash
# Chạy app ở local với store Tubletess
# Cần đã chạy "shopify app config link" và đăng nhập trước.

cd "$(dirname "$0")"

# Store Tubletess - nếu store của bạn dùng URL khác (vd: tubletess-store.myshopify.com), sửa dòng dưới
STORE="${1:-tubletess.myshopify.com}"

echo "Chạy app dev với store: $STORE"
echo "Lần đầu có thể cần cài app vào store (bấm Install khi mở trong Admin)."
echo ""

npx shopify app dev --store "$STORE"
