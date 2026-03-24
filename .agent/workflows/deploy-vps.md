---
description: Deploy the JunimoServer mod to the VPS (15.235.199.163) via Git.
---

// turbo-all
1. Commit any changes to your local repository.
```powershell
git add .
git commit -m "Deploy: Your change description"
```

2. Push to the VPS remote. This will automatically build the mod and restart the server on the VPS.
```powershell
git push vps main
```

> [!NOTE]
> The VPS is configured with a `post-receive` hook that runs `make build` and `docker compose up -d` upon receiving a push.
