# ⚔️ Tu Tiên Live RPC — Thanh Vân Tông

Màn hình live tương tác 9:16 (1080 × 1920) cho OBS / TikTok Live Studio.
Người xem tương tác bằng chat, like, follow/share và gift để nhập tông, luyện khí, đột phá cảnh giới.

## Quyết định đã chốt (31/10/2026)
- Tông môn: Thanh Vân Tông. Giọng TTS: maichi (ZeroTTS, giữ nguyên).
- API: CHỈ dùng namespace `sect.*`. KHÔNG giữ alias `temple.*` — cắt hẳn để tránh nhầm lẫn và để grep sạch.
- AutoSim: được phép khi phòng vắng, nhưng nhân vật mô phỏng bị tách khỏi bảng Chân Truyền, có nhãn Demo, và tự dừng khi có người xem thật (viewerCount > 0).
- Asset: art vẽ mới hoàn toàn cho theme tu tiên bằng `tools/generate-assets.py` (Python compose SVG → headless Chrome/Edge chụp PNG, không cần Pillow, không đụng ảnh Phật gốc của repo zane-tv). Nền Tiên Điện 1080×1920 neo đúng anchor overlay (mặt Tông Chủ 540,260 • tay cầm đài sen 540,502 • miệng lư 540,~905 • 6 đệm quỳ y=1188). 8 frame đệ tử vẽ TỪNG PHẦN CẮT RỜI như repo nguồn (khối tóc bun + tai, cổ áo cao, thân áo đường may sống lưng, đai quấn, 2 tay áo phồng riêng có bóng khe, váy xòe gợn + 2 gối nhô, bàn tay lộ khi lạy, giày lộ khi đi) với viền sáng vàng ấm theo từng phần, giữ đúng tỷ lệ canvas frame gốc (walk 100×240, còn lại 139×190, scale 2×) nên không cần sửa CSS. Muốn chỉnh màu/tư thế: sửa SVG trong script rồi chạy lại `npm run assets` (cần Chrome hoặc Edge).

## Chạy nhanh
```bash
bun install
uv venv .venv
uv pip install --python .venv/bin/python zerotts
SECT_RPC_TOKEN=dat-token-rieng bun start
```
- Live: http://localhost:3000
- OBS sạch: http://localhost:3000/?obs=1
- Admin: http://localhost:3000/admin

## Biến môi trường
- `PORT` (mặc định 3000)
- `SECT_NAME` (mặc định Thanh Vân Tông)
- `SECT_TIKTOK_USER` (chỉ tự kết nối khi có biến này; không mặc định về kênh của tác giả gốc)
- `SECT_RPC_TOKEN` (nếu đặt, bắt buộc cho POST /rpc, /api/tts và action qua WebSocket; trang live đọc state vẫn public để OBS dùng được)
- `SECT_ALLOWED_ORIGINS` (mặc định http://localhost:3000,http://127.0.0.1:3000)

## RPC sect.*
- `sect.getState`, `sect.lightLamp`, `sect.cultivate`, `sect.ringBell`, `sect.sendWish`, `sect.offerGift`, `sect.drawTechnique`, `sect.tribulation`, `sect.updateSettings`, `sect.resetProgress`, `sect.comment`, `sect.speak`, `sect.ttsStatus`, `live.connect`, `live.disconnect`, `live.setAutoSim`

## Cảnh giới
Luyện Khí 0, Trúc Cơ 1.000, Kim Đan 5.000, Nguyên Anh 15.000, Hóa Thần 40.000, Luyện Hư 100.000, Độ Kiếp 250.000 tu vi.
Quà: xu × 3, trần 300 tu vi cho một sự kiện quà. Số khởi tạo: 0.

## Cảnh báo
- Không có license cho code gốc, ảnh và model trong repo gốc; kiểm tra quyền trước khi dùng thương mại.
- TikTok connector không phải API chính thức, có thể đổi giao thức hoặc bị chặn.
- Chưa có test tự động; đã kiểm tra cú pháp server và frontend bằng node --check.

## Kiểm tra và CI
- Test tự động: `npm test` (6 test, chạy server thật trên cổng 34567, không cần TikTok live).
- CI GitHub Actions: cài bun, node --check cho server và frontend, chạy test.
- Asset: `npm run assets` sinh lại toàn bộ art (nền + 8 frame) bằng `tools/generate-assets.py` — Python compose SVG rồi chụp qua headless Chrome/Edge (tự dò trình duyệt, đặt `CHROME_PATH` để chỉ định). Cần cài Chrome/Edge; không cần Pillow.

## License và nguồn gốc
- Fork ý tưởng từ repo gốc zane-tv/tiktok-live-temple-rpc. Repo gốc không có license kèm theo tại thời điểm fork (31/10/2026), nên repo này KHÔNG tự nhận một license mới cho toàn bộ code.
- Phần Jarvis viết mới cho tu tiên (namespace sect.*, cảnh giới, thẻ công pháp, token RPC, test, asset vẽ lại) được phát hành theo MIT, xem LICENSE.
- Trước khi dùng thương mại, cần xác minh quyền của code gốc, ảnh gốc và model ZeroTTS.
