import { GossipSub, GossipSubComponents, GossipsubEvents, GossipsubOpts } from '@chainsafe/libp2p-gossipsub';
import { ToSendGroupCount } from '@chainsafe/libp2p-gossipsub/metrics';
import { PeerIdStr, TopicStr, MessageStatus } from '@chainsafe/libp2p-gossipsub/types';
import { Message } from '@libp2p/interface-pubsub';
import { PubSub } from '@libp2p/interface-pubsub';
import { PeerId } from '@libp2p/interface-peer-id';
import { RPC } from '@chainsafe/libp2p-gossipsub/message';

export interface CenterSubOptions {
  isClient: boolean;
  directPeers: GossipsubOpts['directPeers'];
}

export class CenterSub extends GossipSub {
  public readonly isClient: boolean;

  constructor(components: GossipSubComponents, options: Partial<CenterSubOptions> = {}) {
    const opts = {
      allowPublishToZeroPeers: true,
      directPeers: options?.directPeers || [],
    };
    if (options.isClient && opts.directPeers.length === 0) {
      throw new Error('Address of the server must be provided with "directPeers" option');
    }
    super(components, opts);
    this.isClient = !!options.isClient;
    this['selectPeersToPublish'] = this.onSelectPeersToPublish;
    this['handleReceivedMessage'] = this.onHandleReceivedMessage;
  }

  private async onHandleReceivedMessage(from: PeerId, rpcMsg: RPC.IMessage): Promise<void> {
    if (!this.isClient && rpcMsg && rpcMsg.data && !this['subscriptions'].has(rpcMsg.topic)) {
      const validationResult = await this['validateReceivedMessage'](from, rpcMsg);
      this.subscribe(rpcMsg.topic);
      if (validationResult.code === MessageStatus.valid) {
        super.dispatchEvent(new CustomEvent<Message>('message', { detail: validationResult.msg }));
      }
    }
    super['handleReceivedMessage'](from, rpcMsg);
  }

  private onSelectPeersToPublish(topic: TopicStr): {
    tosend: Set<PeerIdStr>;
    tosendCount: ToSendGroupCount;
  } {
    if (this.isClient) {
      const peersInTopic: Set<string> = this['topics'].get(topic) || new Set<string>();
      for (const peer of this.direct) {
        if (!peersInTopic.has(peer)) {
          peersInTopic.add(peer);
        }
      }
      this['topics'].set(topic, peersInTopic);
    }
    return super['selectPeersToPublish'](topic);
  }
}

export function centerSub(
  options?: Partial<CenterSubOptions>,
): (components: GossipSubComponents) => PubSub<GossipsubEvents> {
  return (components: GossipSubComponents) => new CenterSub(components, options);
}
