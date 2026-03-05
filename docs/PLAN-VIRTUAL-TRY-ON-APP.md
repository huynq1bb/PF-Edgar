# Kế hoạch ứng dụng: Virtual Try-On (Thử trang phục bằng AI trên Storefront)

## 1. Tổng quan ý tưởng

Ứng dụng hiển thị trên **storefront** (gian hàng trực tuyến) của merchant Shopify, cho phép **khách mua hàng** nhập các chỉ số cơ thể và chọn sản phẩm (quần áo, kính, trang sức). Hệ thống dùng **mô hình AI** để tạo hình ảnh/video người mẫu ảo có **chiều cao, cân nặng, màu da, giới tính** tương ứng, mặc/đeo đúng sản phẩm đã chọn, giúp khách **hình dung sản phẩm trên người** trước khi mua.

---

## 2. Mục tiêu sản phẩm

| Mục tiêu | Mô tả |
|----------|--------|
| **Tăng tỷ lệ chuyển đổi** | Khách tự tin hơn khi “thấy” sản phẩm trên người phù hợp với mình. |
| **Giảm tỷ lệ đổi/trả** | Hình dung đúng kích cỡ, phong cách, màu da trước khi đặt hàng. |
| **Trải nghiệm storefront** | Tích hợp mượt vào theme Shopify, không rời store. |
| **Cá nhân hóa** | Kết quả dựa trên chỉ số thật của khách (chiều cao, cân nặng, màu da, giới tính). |

---

## 3. Phạm vi chức năng

### 3.1 Dành cho khách hàng (Storefront)

- **Nhập thông tin cơ thể (chỉ số)**  
  - Chiều cao (cm)  
  - Cân nặng (kg)  
  - Màu da (lựa chọn từ bảng màu / preset)  
  - Giới tính (nam/nữ/khác tùy chọn)  
  - (Tùy chọn mở rộng: vòng ngực, eo, mông, size áo/quần thường mặc)

- **Chọn sản phẩm từ store**  
  - Quần áo (áo, quần, váy, áo khoác…)  
  - Kính (kính mát, kính cận…)  
  - Trang sức (vòng tay, dây chuyền, nhẫn, bông tai…)

- **Xem kết quả AI**  
  - Hình ảnh (hoặc video ngắn) “người mẫu ảo” có chỉ số tương ứng, mặc/đeo đúng sản phẩm đã chọn.  
  - Có thể so sánh nhiều tổ hợp (outfit 1, outfit 2…).

- **Hành động tiếp theo**  
  - Thêm vào giỏ, mua ngay, chia sẻ ảnh thử đồ.

### 3.2 Dành cho merchant (Admin / App embed)

- **Bật/tắt app** trên storefront (theo trang hoặc toàn store).
- **Cấu hình mặc định** (đơn vị: cm/kg, ngôn ngữ, màu da mặc định nếu khách không chọn).
- **Chọn collection/tag** áp dụng Try-On (chỉ sản phẩm quần áo/kính/trang sức được map vào Try-On).
- **Gắn ảnh sản phẩm** với “loại” (áo, quần, kính, trang sức) để AI biết cách overlay lên người mẫu.
- (Tùy chọn) **Xem báo cáo**: số lần dùng Try-On, sản phẩm được thử nhiều nhất, tỷ lệ chuyển đổi từ Try-On → mua.

---

## 4. Kiến trúc kỹ thuật (high-level)

```
┌─────────────────────────────────────────────────────────────────┐
│  STOREFRONT (Theme / App Embed)                                  │
│  - Form nhập: chiều cao, cân nặng, màu da, giới tính             │
│  - Chọn sản phẩm (từ Shopify product/collection)                │
│  - Gọi API app → nhận ảnh/video Try-On                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  SHOPIFY APP (Backend – app hiện tại mở rộng)                    │
│  - Session merchant, lưu cấu hình Try-On                        │
│  - API: nhận chỉ số + product IDs → gọi AI service               │
│  - Lưu cache ảnh (optional): same input → trả cache              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI / RENDER SERVICE (bên thứ 3 hoặc self-hosted)                │
│  - Input: body params + ảnh sản phẩm (quần áo, kính, trang sức) │
│  - Output: ảnh hoặc video người mẫu ảo mặc/đeo sản phẩm          │
│  - Có thể dùng: Virtual Try-On APIs, diffusion models, 3D avatar │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Luồng dữ liệu chính

1. **Merchant** cài app → cấu hình collections/tags và loại sản phẩm (áo, quần, kính, trang sức).
2. **Khách** vào product/collection page có bật Try-On → mở widget/embed.
3. Khách nhập **chiều cao, cân nặng, màu da, giới tính** (và option khác nếu có).
4. Khách **chọn 1 hoặc nhiều sản phẩm** (ví dụ: 1 áo + 1 quần + 1 kính).
5. Frontend gửi **chỉ số + product IDs (và variant)** lên app backend.
6. Backend lấy **ảnh sản phẩm** từ Shopify (featured image / variant image), chuẩn hóa format, gửi sang **AI service** kèm body params.
7. AI service trả **ảnh/video** → app trả về storefront (và có thể cache theo key = hash(input)).
8. Khách xem, so sánh, thêm vào giỏ hoặc mua.

---

## 6. Công nghệ / dịch vụ gợi ý

| Thành phần | Gợi ý |
|------------|--------|
| **Storefront UI** | App Block / Theme App Extension (Shopify) để nhúng vào theme; React hoặc vanilla JS. |
| **Backend** | Mở rộng app Shopify hiện tại (React Router, Prisma); thêm routes API cho Try-On. |
| **Lưu trữ** | SQLite/Postgres (config, cache metadata); S3/Cloudflare R2 (cache ảnh/video). |
| **AI Try-On** | Research: Virtual Try-On APIs (Replicate, Stability, custom model), hoặc dịch vụ chuyên virtual try-on (cần đánh giá chi phí & chất lượng). |
| **Ảnh sản phẩm** | Lấy từ Shopify CDN (product.images); chuẩn hóa crop/background nếu API yêu cầu. |

---

## 7. Rủi ro & hạn chế

- **Chất lượng AI**: Màu da, dáng người có thể chưa giống thật 100%; cần set kỳ vọng (“hình minh họa”) và disclaimer.
- **Hiệu năng**: Render ảnh/video có thể 5–30s; cần loading state, queue, hoặc cache.
- **Chi phí**: Mỗi lần gọi AI tốn tiền; nên cache theo (chỉ số + product IDs), giới hạn số lần thử/khách nếu cần.
- **Quyền riêng tư**: Chỉ số cơ thể là dữ liệu nhạy cảm; cần chính sách bảo mật và không lưu lâu (hoặc chỉ lưu dạng ẩn danh cho analytics).

---

## 8. Các giai đoạn triển khai đề xuất

| Giai đoạn | Nội dung | Ưu tiên |
|-----------|----------|--------|
| **Phase 1 – MVP** | Form chỉ số (chiều cao, cân nặng, màu da, giới tính) + chọn 1 sản phẩm (áo); tích hợp 1 AI API; hiển thị 1 ảnh Try-On trên storefront. | Cao |
| **Phase 2** | Mở rộng: nhiều sản phẩm (áo + quần + kính); cache ảnh; merchant config (bật/tắt, collection). | Cao |
| **Phase 3** | Trang sức, nhiều variant; so sánh 2–3 outfit; nút “Thêm vào giỏ” từ ảnh Try-On. | Trung bình |
| **Phase 4** | Video ngắn, báo cáo merchant, A/B test tỷ lệ chuyển đổi. | Thấp |

---

## 9. Tài liệu tham khảo / bước tiếp theo

- Shopify: [Theme App Extensions](https://shopify.dev/docs/apps/online-store/theme-app-extensions), [App Embed](https://shopify.dev/docs/apps/online-store/app-embeds).
- Research: “Virtual Try-On” APIs (Replicate, Hugging Face, hoặc startup chuyên try-on).
- Thiết kế UI/UX: flow nhập chỉ số thân thiện, mobile-first (nhiều khách mua trên điện thoại).

---

*Tài liệu này là bản kế hoạch ý tưởng, có thể cập nhật khi có thêm yêu cầu hoặc thay đổi công nghệ.*
