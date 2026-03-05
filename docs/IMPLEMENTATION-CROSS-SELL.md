# Implementation Plan: Smart Cross-sell Rules

Tài liệu PO chi tiết: [PO-SMART-CROSS-SELL-RULES.md](./PO-SMART-CROSS-SELL-RULES.md)

## Tổng quan

| Thành phần | Công nghệ / Ghi chú |
|------------|---------------------|
| Admin UI (tạo/sửa rules) | App embedded – React + Polaris (app routes) |
| Lưu rules | Prisma + SQLite (hoặc metafield Shopify) |
| Recommendation API | Route trong app (loader/API) – rule engine + optional AI |
| Storefront block | Theme app extension (block mới hoặc mở rộng virtual-try-on) |
| Cart (Add to cart / Add all) | Storefront API hoặc Cart AJAX (theme extension JS) |

## Các bước triển khai đề xuất

### Phase 1 – Foundation

1. **Data model (Prisma)**  
   - Bảng `CrossSellRule`: triggerType (product/category), triggerValue (id/tag), filters (category, priceMin, priceMax, tags), maxRecommendations, priority, enabled.

2. **Admin: CRUD rules**  
   - Route `/app/cross-sell` (hoặc tab trong app): list rules, create/edit form (trigger, filters, max count, priority). Gọi GraphQL Admin API để lấy collections/product tags nếu cần.

3. **Recommendation engine (backend)**  
   - Route/API nhận `productId` (hoặc `collectionId`), trả về danh sách product IDs đã lọc + (optional) AI ranking.  
   - Logic: match rule theo priority → lọc candidate (category, price, tags) → giới hạn max → (optional) gọi AI ranking → cache theo product + rule.

4. **Cache**  
   - Cache kết quả recommendation (vd. 5–15 phút) để đáp ứng AC8 (ổn định khi reload).

### Phase 2 – Storefront

5. **Theme app extension – Cross-sell block**  
   - Block Liquid mới (vd. `cross-sell-block.liquid`) hiển thị “Thường được mua cùng” + danh sách sản phẩm (image, title, price, Add to cart).  
   - Gọi app backend (hoặc public endpoint) với `productId` (từ context product page) để lấy recommendation.

6. **Add to cart / Add all to cart**  
   - JS trong extension: Add to cart từng variant (Storefront API Cart) hoặc form POST add-to-cart.  
   - Nút “Thêm tất cả vào giỏ”: loop thêm từng sản phẩm (đã chọn variant mặc định hoặc đầu tiên), sau đó redirect/update cart drawer.

7. **Cart page (tuỳ cấu hình)**  
   - Nếu rule cho phép hiển thị trên cart: block tương tự, trigger = cart line items (product/collection).

### Phase 3 – AI & polish

8. **AI ranking (optional)**  
   - Gọi API bên ngoài (hoặc internal service) nhận list product IDs + context (current product), trả về thứ tự đã rank.  
   - Fallback: không có AI thì dùng thứ tự từ filter (vd. price, newest).

9. **Error handling (AC9)**  
   - Nếu recommendation API lỗi hoặc trả rỗng: không render block (hoặc ẩn section).

10. **Mobile UX**  
    - CSS/JS: cross-sell section scroll ngang trên mobile; nút Add to cart trên từng card.

## Liên quan tới repo hiện tại

- **App:** Thêm routes (vd. `app.cross-sell.tsx`, `app.cross-sell._index.tsx`) và Prisma schema.  
- **Theme extension:** Có thể thêm block mới trong `extensions/virtual-try-on` hoặc tạo extension mới `extensions/cross-sell`.  
- **Storefront API:** Cần scope `unauthenticated_read_product_listings` (hoặc tương đương) nếu gọi từ storefront; Add to cart qua Storefront API Cart.

## Checklist AC

- AC1: Block chỉ render khi có recommendation (product match rule).  
- AC2: Backend lọc candidate theo category, price range, tags.  
- AC3: Pipeline có bước AI ranking (hoặc fallback sort).  
- AC4: Slice danh sách theo `maxRecommendations`.  
- AC5–AC6: Nút Add to cart / Add all gọi Cart API.  
- AC7: Sort rules by priority, lấy rule match đầu tiên.  
- AC8: Cache recommendation theo key = productId (+ rule version).  
- AC9: Try/catch recommendation API; ẩn block khi lỗi hoặc rỗng.
