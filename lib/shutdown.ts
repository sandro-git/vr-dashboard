/**
 * Sends a shutdown command to a connected agent WebSocket.
 * Returns true if the command was sent, false if the socket is not open.
 */
export function sendShutdown(socket: WebSocket): boolean {
  if (socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  socket.send(JSON.stringify({ cmd: "shutdown" }));
  return true;
}
