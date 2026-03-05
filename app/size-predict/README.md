# Size prediction feature

Toàn bộ code liên quan **Size prediction** (settings, size groups, test prediction, widget) nằm trong folder này. Mọi thay đổi phát sinh nên được cập nhật tại đây.

## Cấu trúc

| File | Mô tả |
|------|--------|
| `types.ts` | Kiểu (MappingRow, ScopeType, SizePredictLoaderData...), hằng (DEFAULT_SIZES, DEFAULT_MAPPINGS), scopeLabel(), getOverlapWarningIndices() |
| `loader.server.ts` | Loader: settings, rules + mappings, products, collections |
| `action.server.ts` | Action: toggle, saveSettings, createRule, updateRule, deleteRule, duplicateRule, bulkCreateRules, toggleRule, testPrediction |
| `SizeGroupCard.tsx` | Component Card cho từng size group: tên, bảng size (height/weight), overlap warning, Phạm vi áp dụng, Save/Duplicate/Enable-Disable/Delete |
| `page.tsx` | UI: feature toggle, Size prediction setup (test + danh sách Size Groups dạng card, Bulk Edit CSV), widget settings |
| `index.ts` | Re-export để route `app.size-chart.tsx` dùng |

## Section "Size prediction setup"

- **Test prediction**: Height, Weight, Product, Run prediction, kết quả.
- **Danh sách Size Groups**: Mỗi nhóm trong một Card với:
  - Tên nhóm size, bảng Size Name / Height Min-Max / Weight Min-Max / Action (Remove).
  - Overlap warning: cảnh báo khi các khoảng chiều cao/cân nặng chồng lấn.
  - Phạm vi áp dụng: Tất cả sản phẩm | Theo Bộ sưu tập | Chọn thủ công | Theo điều kiện cụ thể.
  - Nút: Save, Duplicate Group, Enable/Disable, Delete.
- **Bulk Edit (CSV/Excel)**: Paste hoặc nhập CSV (header: groupName, scopeType, scopeValue, sizeName, heightMin, heightMax, weightMin, weightMax), Preview rồi Import.

## Route

`app/routes/app.size-chart.tsx` chỉ re-export `loader`, `action`, default component và `headers` từ folder này.

## Phụ thuộc bên ngoài

- `app/lib/sizePredict.server.ts`: `getSuggestedSize()` (logic gợi ý size từ height/weight)
- `app/shopify.server.ts`: `authenticate`
- `app/db.server`: Prisma (SizePredictSettings, SizePredictRule, SizePredictRuleMapping)
