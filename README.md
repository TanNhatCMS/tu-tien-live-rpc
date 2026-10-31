# ⚔️ Tu Tiên Live RPC — Thanh Vân Tông

Màn hình live tương tác 9:16 (1080 × 1920) cho OBS / TikTok Live Studio.
Người xem tương tác bằng chat, like, follow/share và gift để nhập tông, luyện khí, đột phá cảnh giới.

## Quyết định đã chốt (31/10/2026)
- Tông môn: Thanh Vân Tông. Giọng TTS: maichi (ZeroTTS, giữ nguyên).
- API: CHỈ dùng namespace `sect.*`. KHÔNG giữ alias `temple.*` — cắt hẳn để tránh nhầm lẫn và để grep sạch.
- AutoSim: được phép khi phòng vắng, nhưng nhân vật mô phỏng bị tách khỏi bảng Chân Truyền, có nhãn Demo, và tự dừng khi có người xem thật (viewerCount > 0).
- Asset hiện tại là placeholder vẽ lại theo layout gốc, KHÔNG dùng ảnh Phật gốc. Cần thay bằng art hoàn chỉnh trước khi live công khai.

## Chạy nhanh
```bash
bun install
uv venv .venv
uv pip install --python .venv/bin/python zerotts pillow
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
- Asset: `npm run assets` vẽ lại toàn bộ placeholder bằng `tools/generate-assets.py` (PIL). Art hiện tại là placeholder, chưa phải art hoàn chỉnh của họa sĩ.

## License và nguồn gốc
- Fork ý tưởng từ repo gốc zane-tv/tiktok-live-temple-rpc. Repo gốc không có license kèm theo tại thời điểm fork (31/10/2026), nên repo này KHÔNG tự nhận một license mới cho toàn bộ code.
- Phần Jarvis viết mới cho tu tiên (namespace sect.*, cảnh giới, thẻ công pháp, token RPC, test, asset vẽ lại) được phát hành theo MIT, xem LICENSE.
- Trước khi dùng thương mại, cần xác minh quyền của code gốc, ảnh gốc và model ZeroTTS.
