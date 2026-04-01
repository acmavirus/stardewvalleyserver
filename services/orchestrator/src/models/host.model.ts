export interface GameHost {
  id: string; // Unique UUID
  name: string; // Display name
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed' | 'deleted';
  containerId?: string; // Docker container ID
  steamAuthId?: string; // Docker steam-auth container ID
  
  // Port mapping (Allocated dynamically)
  ports: {
    vnc: number;     // e.g. 5800
    api: number;     // e.g. 8080
    game: number;    // e.g. 24642
    query: number;   // e.g. 27015
  };
  
  // Configuration
  config: {
    farmName?: string;
    serverPassword?: string;
    apiKey: string; // Dedicated API key for this specific host
  };
  
  // Timestamps
  createdAt: string;
  lastStartedAt?: string;
}
