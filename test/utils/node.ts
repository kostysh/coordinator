import { createLibp2p, Libp2pOptions, Libp2p } from 'libp2p';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { centerSub, CenterSub } from '../../src/lib/CenterSub';
import { PublishResult } from '@libp2p/interface-pubsub';
import { webSockets } from '@libp2p/websockets';
import { all } from '@libp2p/websockets/filters';
import { PeerId } from '@libp2p/interface-peer-id';
import { peerIdFromString } from '@libp2p/peer-id';
import { Multiaddr, multiaddr } from '@multiformats/multiaddr';
import { encodeText, decodeText } from '../../src/utils/text';
import { simpleUid } from '../../src/utils/uid';
import { defaultExpirationTime } from '../../src/lib/constants';
import { Logger } from '../../src/utils/logger';

export const logger = Logger('TestNode');

export class TestNode {
  serverAddress: Multiaddr;
  serverPeerId: PeerId;
  options: Libp2pOptions;
  libp2p: Libp2p;

  constructor(serverUri: string, options: Libp2pOptions = {}) {
    this.serverAddress = multiaddr(serverUri);
    const peerId = this.serverAddress.getPeerId();
    if (!peerId) {
      throw new Error(`Invalid server URI: ${serverUri}`);
    }
    this.serverPeerId = peerIdFromString(peerId);
    this.options = options;
  }

  get connected(): boolean {
    return (this.libp2p.pubsub as CenterSub).started && this.libp2p.getPeers().length > 0;
  }

  async start(): Promise<void> {
    const config: Libp2pOptions = {
      transports: [webSockets({ filter: all })],
      streamMuxers: [mplex()],
      connectionEncryption: [noise()],
      pubsub: centerSub({
        isClient: true,
        directPeers: [
          {
            id: this.serverPeerId,
            addrs: [this.serverAddress],
          },
        ],
      }),
      ...this.options,
    };
    this.libp2p = await createLibp2p(config);

    this.libp2p.addEventListener('peer:discovery', async ({ detail }) => {
      const id = detail.id.toString();
      logger.info('Peer discovery:', id);
    });

    this.libp2p.addEventListener('peer:connect', async ({ detail }) => {
      const id = detail.id.toString();
      logger.info('Peer connected:', id);
    });

    this.libp2p.addEventListener('peer:disconnect', async ({ detail }) => {
      const id = detail.id.toString();
      logger.info('Peer disconnected:', id);
    });

    this.libp2p.pubsub.addEventListener('message', ({ detail }) => {
      logger.debug(`Message: ${decodeText(detail.data)} on topic ${detail.topic}`);
    });

    this.libp2p.pubsub.subscribe('hello');
    this.libp2p.pubsub.subscribe('yo');

    await this.libp2p.start();
    logger.info('🚀 Started at:', new Date().toISOString());
  }

  async stop(): Promise<void> {
    await this.libp2p.stop();
  }

  async publish(topic: string, message: string): Promise<PublishResult> {
    return await this.libp2p.pubsub.publish(topic, encodeText(message));
  }
}

const counters = {
  yo: 1,
};

export const generateMessage = (nonce: number, query: string) => ({
  id: simpleUid(),
  expire: Math.ceil(Date.now() / 1000) + defaultExpirationTime,
  nonce,
  query,
});

export const createFloodNode = async (
  server = '/ip4/127.0.0.1/tcp/33333/ws/p2p/QmcXbDrzUU5ERqRaronWmAJXwe6c7AEkS7qdcsjgEuWPCf',
) => {
  try {
    const node = new TestNode(server);
    await node.start();

    setInterval(async () => {
      try {
        await node.publish('yo', JSON.stringify(generateMessage(counters.yo++, 'yo')));
      } catch (error) {
        console.log(error);
      }
    }, 3000);
  } catch (error) {
    logger.error(error);
  }
};

export const createSilentNode = async (
  server = '/ip4/127.0.0.1/tcp/33333/ws/p2p/QmcXbDrzUU5ERqRaronWmAJXwe6c7AEkS7qdcsjgEuWPCf',
) => {
  try {
    const node = new TestNode(server);
    await node.start();
  } catch (error) {
    logger.error(error);
  }
};
