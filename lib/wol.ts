/**
 * Wake-on-LAN: builds and sends a magic packet via UDP broadcast on port 9.
 * Magic packet format: 6 bytes of 0xFF followed by the target MAC repeated 16 times.
 */
export async function sendWakeOnLan(mac: string): Promise<void> {
  const macBytes = parseMac(mac);

  // Build magic packet: FF FF FF FF FF FF + MAC*16
  const packet = new Uint8Array(6 + 6 * 16);
  packet.fill(0xff, 0, 6);
  for (let i = 0; i < 16; i++) {
    packet.set(macBytes, 6 + i * 6);
  }

  const conn = await Deno.connect({
    transport: "udp",
    hostname: "255.255.255.255",
    port: 9,
  });

  try {
    await conn.send(packet);
  } finally {
    conn.close();
  }
}

function parseMac(mac: string): Uint8Array {
  const parts = mac.split(/[:\-]/);
  if (parts.length !== 6) {
    throw new Error(`Invalid MAC address: ${mac}`);
  }
  return new Uint8Array(parts.map((p) => parseInt(p, 16)));
}
