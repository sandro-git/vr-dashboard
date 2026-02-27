export interface PC {
  id: number;
  name: string;
  ip: string;
  mac: string;
  network: number;
}

export const PCS: PC[] = [
  { id: 1, name: "VR-SERVER", ip: "192.168.1.28", mac: "A4-BB-6D-52-1E-9B", network: 1 },
  { id: 2, name: "VR-STATION-1", ip: "192.168.1.25", mac: "A4:BB:6D:51:FA:4A", network: 1 },
  { id: 3, name: "VR-STATION-2", ip: "192.168.1.71", mac: "30:D0:42:E9:F5:63", network: 1 },
  { id: 4, name: "VR-STATION-3", ip: "192.168.1.104", mac: "AA:BB:CC:DD:EE:04", network: 1 },
  { id: 5, name: "VR-STATION-4", ip: "192.168.1.105", mac: "AA:BB:CC:DD:EE:05", network: 1 },
  { id: 6, name: "VR-STATION-5", ip: "192.168.1.106", mac: "AA:BB:CC:DD:EE:06", network: 1 },
  { id: 7, name: "VR-STATION-6", ip: "192.168.1.107", mac:"AA-BB-CC-DD-EE-07", network : 1 },
];
