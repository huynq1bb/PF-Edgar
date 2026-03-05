# PO: Smart Cross-sell Rules

## 1. Mô tả tính năng (Feature Description)

### Vấn đề của người dùng (User Problem)

Khi mua sắm online, khách hàng thường chỉ xem một sản phẩm riêng lẻ và không biết nên mua thêm sản phẩm nào để kết hợp cùng.

Điều này dẫn đến một số vấn đề:

- Khách hàng không biết sản phẩm nào phù hợp để mua kèm hoặc phối cùng sản phẩm đang xem.
- Các block gợi ý sản phẩm trên website thường không liên quan hoặc mang tính ngẫu nhiên.
- Khách hàng thường chỉ mua một sản phẩm riêng lẻ, thay vì mua theo combo.
- Người mua có thể rời khỏi trang mà không khám phá thêm các sản phẩm liên quan.

Kết quả là khách hàng bỏ lỡ các sản phẩm phù hợp, đồng thời merchant mất cơ hội tăng giá trị đơn hàng.

### Mục đích của tính năng (Feature Purpose)

**Smart Cross-sell Rules** cho phép merchant cấu hình quy tắc gợi ý mua kèm sản phẩm dựa trên các điều kiện cụ thể.

Merchant có thể định nghĩa rule dựa trên:

- **Category** sản phẩm
- **Khoảng giá** (price range)
- **Style** hoặc **product tags**

Hệ thống sẽ:

1. Dùng **rule-based filtering** để lọc ra danh sách sản phẩm phù hợp.
2. Sử dụng **AI ranking** để sắp xếp các sản phẩm này theo mức độ liên quan.

Nhờ vậy, hệ thống vừa đảm bảo gợi ý đúng chiến lược bán hàng của merchant, vừa tối ưu khả năng mua kèm bằng AI.

**Ví dụ hiển thị trên product page:**

```
Thường được mua cùng
Product A (sản phẩm đang xem)  |  Product B (gợi ý)  |  Product C (gợi ý)
[ Thêm tất cả vào giỏ hàng ]
```

### Mục tiêu kinh doanh (Business Goals)

- Tăng **Average Order Value (AOV)** bằng cách khuyến khích khách mua thêm sản phẩm.
- Tăng **attach rate** (tỷ lệ mua kèm).
- Cho phép merchant **kiểm soát logic** gợi ý sản phẩm.
- Tăng khả năng **khám phá sản phẩm** cho shopper.
- Kết hợp **rule + AI** để tạo ra gợi ý ổn định và chính xác hơn.

### Người dùng mục tiêu (Target Users)

| Loại | Mô tả |
|------|--------|
| **Primary** | Khách hàng mua sắm online; người đang xem sản phẩm và có nhu cầu tìm sản phẩm bổ trợ hoặc phối cùng. |
| **Secondary** | Merchant muốn tăng AOV, tăng doanh thu từ sản phẩm mua kèm, kiểm soát logic recommendation. |

---

## 2. Phạm vi tính năng (Feature Scope)

### Trong phạm vi (In Scope)

- **Merchant** có thể tạo cross-sell rules trong trang quản trị.
- **Rule** cho phép cấu hình:
  - **Trigger condition:** Theo product / Theo category
  - **Candidate product filters:** Category, Price range, Style / product tags
  - **Rule config:** Số lượng gợi ý tối đa, Độ ưu tiên (priority)
- **Recommendation generation:**
  - Lọc candidate products theo rule
  - AI ranking để sắp xếp
  - Trả về danh sách gợi ý
- **Hiển thị trên storefront:**
  - Product page (bắt buộc)
  - Cart page (tuỳ cấu hình)
- UI ví dụ: *Thường được mua cùng* + danh sách sản phẩm + **[ Thêm tất cả vào giỏ ]**
- User có thể thêm từng sản phẩm hoặc tất cả vào giỏ hàng.

### Ngoài phạm vi – Phase 1 (Out of Scope)

- Bundle discount
- Recommendation cá nhân hóa theo hành vi
- Dynamic pricing cho combo
- Recommendation dựa trên tồn kho
- Recommendation theo lịch sử mua hàng
- A/B testing cho thuật toán recommendation

---

## 3. User Stories

| # | Là | Tôi muốn | Để |
|---|-----|----------|-----|
| 1 | Shopper | Thấy các sản phẩm gợi ý liên quan đến sản phẩm đang xem | Khám phá thêm sản phẩm phù hợp |
| 2 | Shopper | Thêm nhanh các sản phẩm được gợi ý vào giỏ hàng | Mua nhiều sản phẩm cùng lúc |
| 3 | Merchant | Cấu hình cross-sell rule theo category, price hoặc style | Kiểm soát sản phẩm được gợi ý cùng nhau |
| 4 | Merchant | Hệ thống dùng AI để sắp xếp thứ tự sản phẩm gợi ý | Sản phẩm phù hợp nhất xuất hiện trước |
| 5 | Shopper | Danh sách gợi ý không thay đổi liên tục khi reload | Dễ ra quyết định mua hàng |

---

## 4. Acceptance Criteria

| ID | Given | When | Then |
|----|--------|------|------|
| **AC1** | Khách đang ở product page | Sản phẩm phù hợp với cross-sell rule | Hệ thống hiển thị block gợi ý mua kèm |
| **AC2** | Tồn tại cross-sell rule | Hệ thống xử lý trigger product | Lọc candidate theo category, price range, style/tags |
| **AC3** | Có danh sách candidate products | Hệ thống tạo recommendation | AI ranking sắp xếp theo mức độ liên quan |
| **AC4** | Hệ thống tạo recommendation | Chọn sản phẩm gợi ý | Số lượng ≤ giới hạn rule (vd. max = 3) |
| **AC5** | Sản phẩm gợi ý được hiển thị | Khách bấm Add to cart | Sản phẩm được thêm vào giỏ |
| **AC6** | Nhiều sản phẩm gợi ý hiển thị | Khách bấm Add all to cart | Tất cả sản phẩm gợi ý được thêm vào giỏ |
| **AC7** | Nhiều rule match một sản phẩm | Hệ thống chọn rule | Rule có **priority cao nhất** được dùng |
| **AC8** | Product page load nhiều lần | Dữ liệu recommendation không đổi | Danh sách gợi ý ổn định (cache) |
| **AC9** | Recommendation engine gặp lỗi | Không thể tạo recommendation | Block cross-sell **không** hiển thị |

---

## 5. Detailed UX Flow – Storefront

### Step 1 – Product Page

- **Vị trí:** Block cross-sell bên dưới product details.
- **Nội dung:** *Thường được mua cùng* + Product B, Product C, Product D + **[ Thêm tất cả vào giỏ ]**
- **Điều kiện:** Block chỉ xuất hiện khi product match rule.
- **Product card:** Image, name, price, Add to cart.

### Step 2 – Hành động

- Click sản phẩm → xem chi tiết.
- Add từng sản phẩm vào cart.
- Add tất cả sản phẩm cùng lúc.

### Step 3 – Add all to cart

- User bấm **Thêm tất cả vào giỏ**.
- System thêm tất cả sản phẩm gợi ý vào cart.
- Cart icon cập nhật số lượng.
- Thông báo: *Đã thêm sản phẩm vào giỏ hàng.*

### Step 4 – Cart

- Cart hiển thị: Product A (chính) + Product B, C (gợi ý).

### Mobile UX

- Cross-sell section: danh sách scroll ngang.
- Swipe để xem thêm.
- Add to cart trực tiếp từ product card.

---

## 6. Tóm tắt kỹ thuật (Technical Summary)

- **Admin (app):** CRUD cross-sell rules (trigger, filters, max count, priority).
- **Backend:** Rule engine + (optional) AI ranking API; cache recommendation theo product/rule.
- **Storefront:** Theme app extension hoặc app embed: block “Thường được mua cùng” + Add to cart / Add all to cart (Storefront API / Cart AJAX).
- **Data:** Rules lưu DB hoặc metafield; candidate lấy từ Shopify products (collection/category, price, tags).
