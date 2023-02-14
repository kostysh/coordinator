import { createLibp2p, Libp2pOptions, Libp2p } from 'libp2p';
import { createFromJSON } from '@libp2p/peer-id-factory';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { centerSub, CenterSub } from './lib/CenterSub';
import { webSockets } from '@libp2p/websockets';
import { all } from '@libp2p/websockets/filters';
import { decodeText } from './utils/text';
import { Logger } from './utils/logger';
import { GenericMessage } from './lib/messages';

const logger = Logger('Coordinator');

export interface NodeKeyJson {
  id: string;
  privKey?: string;
  pubKey?: string;
}

export interface CoordinatorOptions {
  port: number;
  nodeKeyJson: NodeKeyJson;
}

export class Coordinator {
  public port: number;
  protected nodeKeyJson: NodeKeyJson;
  protected libp2p: Libp2p;

  constructor(options: CoordinatorOptions) {
    this.port = options.port;
    this.nodeKeyJson = options.nodeKeyJson;
  }

  get multiaddrs() {
    return this.libp2p.getMultiaddrs();
  }

  async start(): Promise<void> {
    const config: Libp2pOptions = {
      addresses: {
        listen: [`/ip4/0.0.0.0/tcp/${this.port}/ws`],
      },
      transports: [webSockets({ filter: all })],
      streamMuxers: [mplex()],
      connectionEncryption: [noise()],
      pubsub: centerSub({
        messageTransformer: <GenericMessage>(data: BufferSource) => {
          const dataString = decodeText(data);
          const dataObj = JSON.parse(dataString) as GenericMessage;
          return dataObj;
        },
      }),
    };
    const peerId = await createFromJSON(this.nodeKeyJson);
    this.libp2p = await createLibp2p({ peerId, ...config });

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

    (this.libp2p.pubsub as CenterSub).addEventListener('message', ({ detail }) => {
      logger.debug(`Message: ${decodeText(detail.data)} on topic ${detail.topic}`);
    });

    await this.libp2p.start();
    logger.info('🚀 Started at:', new Date().toISOString());
    logger.info('Listened for peers at:', this.multiaddrs);
  }

  async stop(): Promise<void> {
    await this.libp2p.stop();
  }
}
