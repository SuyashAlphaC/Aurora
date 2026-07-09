import type { WebSocket } from "ws";
import type { WsEvent } from "../types.js";

export class WsHub {
  private clients = new Set<WebSocket>();

  add(client: WebSocket): void {
    this.clients.add(client);
  }

  remove(client: WebSocket): void {
    this.clients.delete(client);
  }

  broadcast<T>(event: WsEvent<T>): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const wsHub = new WsHub();
