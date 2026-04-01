# Analysis Documentation: Junimo Server Cluster-Based SaaS Architecture

## 1. Overview
Mục tiêu của tài liệu này là xác định kiến trúc nâng cấp từ một máy chủ (Single-host) sang hệ thống đa máy chủ (Multi-host/Cluster) theo mô hình SaaS. Hệ thống cho phép người dùng tự động khởi tạo, quản lý và vận hành các instance Stardew Valley server hoàn toàn cách ly với nhau qua giao diện API tập trung.

---

## 2. Current State Analysis
Hiện tại, hệ thống là một cụm Docker Compose cố định:
- **Port:** Cố định (VNC: 5800, API: 8080, UDP: 24642, QUERY: 27015).
- **Storage:** Sử dụng Docker Volumes cục bộ gắn cứng (`game-data`, `saves`).
- **Management:** Chỉ có API của từng Mod SMAPI bên trong container, không có API quản trị (Control Plane) bên ngoài để điều phối các máy con.
- **Scalability:** Chưa thể chạy nhiều instance trên cùng một IP mà không bị xung đột Port.

---

## 3. High-Level Architecture (SaaS Model)

### 3.1. Control Plane (Master API/Orchestrator)
Đóng vai trò là "bộ não" điều phối toàn bộ hệ thống:
- **Service Discovery:** Biết được instance nào đang chạy trên port nào, IP nào.
- **Port Manager:** Một module quản lý dải port (Pool) để tự động cấp phát cho Host mới.
- **Resource Management:** Giới hạn tài nguyên (RAM: ~2GB, CPU: 1 Core) cho từng Container để tránh hiện tượng "Neighbor Noise".
- **Container Lifecycle:** Thực hiện lệnh `create`, `start`, `stop`, `restart`, `upgrade` cho từng server.

### 3.2. Data Plane (Game Nodes)
Bao gồm các máy chủ vật lý/VPS cài đặt Docker Engine:
- Mỗi Game Host là một cụm container (`server`, `steam-auth`) độc lập.
- Gắn nhãn Docker (Docker Labels) để Master API và Reverse Proxy có thể nhận diện.

### 3.3. Edge Layer (Reverse Proxy)
Sử dụng **Traefik** hoặc **Nginx Proxy Manager**:
- **Dynamic Routing:** Tự động định tuyến `host1.stardew.com` -> container 1.
- **SSL Termination:** Tự động cấp SSL (Let's Encrypt) cho tất cả các endpoint API và VNC Web.

---

## 4. Technical Strategy

### 4.1. Core Orchestrator Stack
- **Runtime:** Node.js (TypeScript) hoặc Go.
- **Communication:** Docker SDK (quản lý Container qua Unix Socket hoặc TCP).
- **Database:** SQLite (cho giai đoạn Alpha) hoặc MongoDB để lưu trạng thái Host.

### 4.2. Storage & Persistence
- **Structure:** `/data/junimo-server/hosts/{host_id}/saves`
- **Volume Type:** Bind mounts (không dùng Docker Volumes đặt tên) để Master API có thể dễ dàng can thiệp và sao lưu dữ liệu cho khách hàng.

---

## 5. Implementation Roadmap (Phases)

### Phase 1: Local Multi-Host Orchestrator (Hiện tại)
- Xây dựng Master API cơ bản chạy trên cùng một VPS.
- Quản lý nhiều game instance trên cùng một VPS bằng cách dùng Dynamic Ports.
- Triển khai Traefik để điều hướng API.

### Phase 2: Host Management & Auth
- Thêm hệ thống Authentication cho Master API.
- Xây dựng Web Dashboard đơn giản để User có thể bấm nút "Tạo Server".

### Phase 3: Cluster Expansion (Multi-Node)
- Kết nối nhiều VPS (Nodes) khác nhau vào một Master API duy nhất.
- Hỗ trợ di chuyển Save (Migration) giữa các VPS.

---

## 6. Risks & Mitigation
- **Port Exhaustion:** Giới hạn số lượng host trên mỗi IP.
- **Memory Contention:** Stardew Valley (Monogame) tốn RAM, cần cơ chế Monitoring liên tục từ Master API.
- **Security:** API Key của Master phải cực kỳ bảo mật (tách biệt hoàn toàn với API Key của từng mod).

---
*Created: 2026-04-01 | Version: 1.0.0*
