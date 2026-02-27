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
  { id: 3, name: "VR-03", ip: "192.168.1.103", mac: "AA:BB:CC:DD:EE:03", network: 1 },
  { id: 4, name: "VR-04", ip: "192.168.1.104", mac: "AA:BB:CC:DD:EE:04", network: 1 },
  { id: 5, name: "VR-05", ip: "192.168.1.105", mac: "AA:BB:CC:DD:EE:05", network: 1 },
  { id: 6, name: "VR-06", ip: "192.168.1.106", mac: "AA:BB:CC:DD:EE:06", network: 1 },
  { id: 7, name: "VR-07", ip: "192.168.1.107", mac: "AA:BB:CC:DD:EE:07", network: 1 },
];
