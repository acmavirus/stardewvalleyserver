---
description: Check the VPS game server status.
---

1. Check the Docker container status on the VPS.
```powershell
ssh root@15.235.199.163 "cd stardew-valley-server; docker compose ps"
```

2. Fetch the current game status from the internal API.
```powershell
ssh root@15.235.199.163 "curl -s http://localhost:8080/status"
```

3. View recent server logs.
```powershell
ssh root@15.235.199.163 "cd stardew-valley-server; docker compose logs --tail=50 server"
```
