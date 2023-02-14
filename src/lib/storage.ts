import { RPC } from '@chainsafe/libp2p-gossipsub/message';
import { Logger } from '../utils/logger';

const logger = Logger('MessagesStorage');

export interface CachedMessage {
  peerId: string;
  expire: number;
  data: RPC.IMessage;
  nonce: number;
}

export interface CashedMessageEntry {
  id: string;
  data: RPC.IMessage;
}

export class MessagesStorage {
  private cache: Map<string, CachedMessage> = new Map();

  prune(): void {
    const now = Math.ceil(Date.now() / 1000);
    for (const [id, message] of this.cache) {
      if (message.expire < now) {
        this.cache.delete(id);
      }
    }
  }

  get(): CashedMessageEntry[] {
    const messages: CashedMessageEntry[] = [];
    for (const [id, entry] of this.cache) {
      messages.push({
        id,
        data: entry.data,
      });
    }
    return messages;
  }

  set(messageId: string, peerId: string, data: RPC.IMessage, expire: number, nonce = 1): void {
    try {
      let message = this.cache.get(messageId);
      if (message) {
        if (message.peerId !== peerId) {
          throw new Error(`Invalid message peerId: ${peerId} while expected: ${message.peerId}`);
        }
        if (nonce <= message.nonce) {
          logger.debug('Message ignored: outdated nonce');
          return;
        }
      }
      message = {
        peerId,
        expire,
        data,
        nonce,
      };
      this.cache.set(messageId, message);
      logger.debug('set:', messageId, this.cache.size);
    } catch (error) {
      logger.error(error);
    }
  }
}
