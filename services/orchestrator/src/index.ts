import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase } from './database/db.ts';
import { DockerService } from './core/docker.service.ts';
import { PortAllocator } from './utils/port-allocator.ts';
import { GameHost } from './models/host.model.ts';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const MASTER_API_KEY = process.env.MASTER_API_KEY || 'master-key';

app.use(cors());
app.use(express.json());

// Auth middleware for Master API
const authenticateMaster = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${MASTER_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized Master Account' });
  }
  next();
};

const docker = new DockerService();
const portAllocator = new PortAllocator(db);

/**
 * Endpoint: PROVISION A NEW GAME HOST
 */
app.post('/hosts', authenticateMaster, async (req, res) => {
  try {
    const { name, farmName, serverPassword } = req.body;
    
    // Allocate resources
    const hostId = uuidv4();
    const ports = await portAllocator.allocate();
    const hostApiKey = uuidv4(); // Unique API key for the new host
    
    const host: GameHost = {
      id: hostId,
      name,
      status: 'starting',
      ports,
      config: {
        farmName,
        serverPassword,
        apiKey: hostApiKey
      },
      createdAt: new Date().toISOString()
    };
    
    // Save to DB first
    await db('hosts').insert({
      id: host.id,
      name: host.name,
      status: host.status,
      vnc_port: host.ports.vnc,
      api_port: host.ports.api,
      game_port: host.ports.game,
      query_port: host.ports.query,
      apiKey: host.config.apiKey,
      farmName: host.config.farmName,
      serverPassword: host.config.serverPassword,
      createdAt: host.createdAt
    });
    
    // Start Docker
    try {
      const containerInfo = await docker.createHost(host);
      await db('hosts').where({ id: hostId }).update({
        containerId: containerInfo.containerId,
        steamAuthId: containerInfo.steamAuthId,
        status: 'running',
        lastStartedAt: new Date().toISOString()
      });
      
      res.status(201).json({ 
        message: 'Host created and starting', 
        id: hostId,
        hostApiKey,
        ports 
      });
    } catch (dockerErr: any) {
      console.error('Docker Creation Failed:', dockerErr);
      await db('hosts').where({ id: hostId }).update({ status: 'failed' });
      res.status(500).json({ error: 'Failed to create docker instance', details: dockerErr.message });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Provisioning failed', details: err.message });
  }
});

/**
 * Endpoint: LIST ALL HOSTS
 */
app.get('/hosts', authenticateMaster, async (req, res) => {
  const hosts = await db('hosts').select('*');
  res.json(hosts);
});

/**
 * Endpoint: DELETE A HOST
 */
app.delete('/hosts/:id', authenticateMaster, async (req, res) => {
  const { id } = req.params;
  const host = await db('hosts').where({ id }).first();
  if (!host) return res.status(404).json({ error: 'Host not found' });
  
  try {
    if (host.containerId && host.steamAuthId) {
      await docker.stopHost(host.containerId, host.steamAuthId);
    }
    await db('hosts').where({ id }).delete();
    res.json({ message: `Host ${id} successfully deleted` });
  } catch (err: any) {
    res.status(500).json({ error: 'Deletion failed', details: err.message });
  }
});

// Initialization
initDatabase().then(() => {
  app.listen(port, () => {
    console.log(`[Junimo Orchestrator] Master API listening on port ${port}`);
  });
});
