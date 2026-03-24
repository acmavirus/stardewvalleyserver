---
name: JunimoServer
description: Specialized instructions for building and maintaining the JunimoServer (Stardew Valley Dedicated Server) project.
---

# JunimoServer (SDVD Server)

JunimoServer is an open-source dedicated server solution for Stardew Valley that enables 24/7 multiplayer hosting with SMAPI mod support.

## Project Architecture

- **Game Mod (C# / SMAPI)**: Located in `mod/JunimoServer/`. This mod handles server logic (Saving, AlwaysOn, Chat Commands, Role Management).
- **Docker Infrastructure**: Uses Docker to run the game (via Wine/X11/VNC) and SteamCMD to manage game files. `docker-compose.yml` and `.env` are central to this.
- **Steam Integration**: Uses `steam-auth` container for authenticating with Steam to download game files.

## Production VPS Details
- **IP Address**: `15.235.199.163`
- **Username**: `root`
- **Deployment Strategy**: Build locally or on server, then run using Docker Compose.

## Common Development Commands

### 1. Build the Mod
Run this to compile the SMAPI mod:
```powershell
dotnet build mod/JunimoServer/JunimoServer.csproj
```

### 2. Start the Server
Start all containers in background:
```powershell
docker compose up -d
```

### 3. Check Logs
Monitor the server output:
```powershell
docker compose logs -f
```

### 4. Steam Authentication Setup
Run interactive setup for Steam Guard:
```powershell
docker compose run --rm -it steam-auth setup
```

### 5. Deploy to VPS (15.235.199.163)
Deploys the built mod and restarts the server:
```powershell
# Use the /deploy-vps slash command or run manually:
dotnet build mod/JunimoServer/JunimoServer.csproj -c Release
ssh root@15.235.199.163 "mkdir -p /home/stardew-server/mods/JunimoServer"
scp -r mod/JunimoServer/bin/Release/net6.0/* root@15.235.199.163:/home/stardew-server/mods/JunimoServer/
ssh root@15.235.199.163 "cd /home/stardew-server && docker compose restart"
```

## Key Modules in the Mod (C#)
- `AlwaysOn`: State management to keep the server running without players.
- `CabinManager`: Automated management of player cabins and slots.
- `ChatCommands`: Implementation of `/kick`, `/ban`, `/auth`, etc.
- `Roles`: Admin permission system.
- `Lobby`: Management of multiplayer sessions and game loading.

## Development Workflow
1. **Making changes to the mod**: Edit C# files in `mod/JunimoServer/`.
2. **Rebuilding**: Run `dotnet build`.
3. **Deploying**: The Docker setup typically mounts the build output or requires a rebuild of the image. Refer to `docker-compose.yml` for mount volumes.
4. **Testing**: Use the `tests/` directory for automated tests.

## Coding Standards
- **C#**: Use standard .NET conventions. SMAPI API should be used for game interaction.
- **Logs**: Use `Monitor.Log()` for SMAPI logging within the mod.
- **Docker**: Mantain `docker-compose.yml` and `.env.example` when changing infrastructure.
