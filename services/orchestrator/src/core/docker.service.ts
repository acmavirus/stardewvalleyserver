import Docker from 'dockerode';
import { GameHost } from '../models/host.model.ts';
import fs from 'fs';
import path from 'path';

export class DockerService {
  private docker: Docker;

  constructor() {
    // Connect to local docker socket
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  /**
   * Starts a new game host container cluster (server + steam-auth)
   */
  async createHost(host: GameHost) {
    const hostDir = path.join('/data/hosts', host.id);
    const savesDir = path.join(hostDir, 'saves');
    const settingsDir = path.join(hostDir, 'settings');
    
    // Ensure host directories exist
    if (!fs.existsSync(savesDir)) fs.mkdirSync(savesDir, { recursive: true });
    if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
    
    // 1. Create steam-auth service
    const authContainer = await this.docker.createContainer({
      Image: 'sdvd/steam-service:latest',
      name: `sdvd-steam-auth-${host.id}`,
      HostConfig: {
        Binds: [
            `sdvd-steam-session-${host.id}:/data/steam-session`,
            `sdvd-game-data-${host.id}:/data/game`
        ],
        RestartPolicy: { Name: 'unless-stopped' }
      },
      Env: [
        `PORT=3001`,
        `GAME_DIR=/data/game`,
        `SESSION_DIR=/data/steam-session`
      ]
    });

    await authContainer.start();

    // 2. Create main server service
    const serverContainer = await this.docker.createContainer({
      Image: 'sdvd/server:latest',
      name: `sdvd-server-${host.id}`,
      ExposedPorts: {
        '5800/tcp': {},
        '8080/tcp': {},
        '24642/udp': {},
        '27015/udp': {}
      },
      HostConfig: {
        PortBindings: {
          '5800/tcp': [{ HostPort: host.ports.vnc.toString() }],
          '8080/tcp': [{ HostPort: host.ports.api.toString() }],
          '24642/udp': [{ HostPort: host.ports.game.toString() }],
          '27015/udp': [{ HostPort: host.ports.query.toString() }]
        },
        Binds: [
          `sdvd-game-data-${host.id}:/data/game`,
          `${savesDir}:/config/xdg/config/StardewValley`,
          `${settingsDir}:/data/settings`
        ],
        RestartPolicy: { Name: 'unless-stopped' },
        CapAdd: ['SYS_TIME']
      },
      Labels: {
        // Traefik routing
        [`traefik.http.routers.host-${host.id}.rule`]: `Host("${host.id}.stardew.com")`,
        [`traefik.http.routers.host-${host.id}.entrypoints`]: 'websecure',
        [`traefik.http.routers.host-${host.id}.tls.certresolver`]: 'myresolver',
        [`traefik.http.services.host-${host.id}.loadbalancer.server.port`]: '8080'
      },
      Env: [
        `STEAM_AUTH_URL=http://sdvd-steam-auth-${host.id}:3001`,
        `API_PORT=8080`,
        `API_KEY=${host.config.apiKey}`,
        `SETTINGS_PATH=/data/settings/server-settings.json`,
        `DISABLE_RENDERING=true`
      ]
    });

    await serverContainer.start();
    
    return {
      containerId: serverContainer.id,
      steamAuthId: authContainer.id
    };
  }

  async stopHost(containerId: string, authId: string) {
    const server = this.docker.getContainer(containerId);
    const auth = this.docker.getContainer(authId);
    
    await server.stop();
    await server.remove();
    await auth.stop();
    await auth.remove();
  }
}
