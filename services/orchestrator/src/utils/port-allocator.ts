import { Knex } from 'knex';

export interface AllocatedPorts {
  vnc: number;
  api: number;
  game: number;
  query: number;
}

export class PortAllocator {
  // Base ports (avoiding the default ports 5800, 8080, 24642, 27015 used by the current instance)
  private static readonly RANGES = {
    vnc: { start: 5801, end: 5899 },
    api: { start: 8081, end: 8199 },
    game: { start: 24643, end: 24699 },
    query: { start: 27016, end: 27099 },
  };

  constructor(private readonly db: Knex) {}

  /**
   * Allocates a set of 4 unique ports for a new host.
   * Checks the database for already used ports.
   */
  async allocate(): Promise<AllocatedPorts> {
    const usedPorts = await this.getUsedPorts();
    
    const vnc = this.findFreePort(PortAllocator.RANGES.vnc.start, PortAllocator.RANGES.vnc.end, usedPorts.vnc);
    const api = this.findFreePort(PortAllocator.RANGES.api.start, PortAllocator.RANGES.api.end, usedPorts.api);
    const game = this.findFreePort(PortAllocator.RANGES.game.start, PortAllocator.RANGES.game.end, usedPorts.game);
    const query = this.findFreePort(PortAllocator.RANGES.query.start, PortAllocator.RANGES.query.end, usedPorts.query);
    
    return { vnc, api, game, query };
  }

  private findFreePort(start: number, end: number, used: number[]): number {
    for (let port = start; port <= end; port++) {
      if (!used.includes(port)) {
        return port;
      }
    }
    throw new Error(`Port exhaustion in range ${start}-${end}`);
  }

  private async getUsedPorts(): Promise<{ vnc: number[]; api: number[]; game: number[]; query: number[] }> {
    const hosts = await this.db('hosts').select('vnc_port', 'api_port', 'game_port', 'query_port');
    
    return {
      vnc: hosts.map(h => h.vnc_port),
      api: hosts.map(h => h.api_port),
      game: hosts.map(h => h.game_port),
      query: hosts.map(h => h.query_port),
    };
  }
}
