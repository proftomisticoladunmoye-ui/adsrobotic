import type { AdvertisingChannel, ChannelId } from './types';

/**
 * Runtime registry of channel adapters (Spec §4). Adapters register themselves
 * so the rest of the app resolves a channel by id without importing concrete
 * integrations — keeping connectors replaceable modules.
 */
const registry = new Map<ChannelId, AdvertisingChannel>();

export function registerChannel(channel: AdvertisingChannel): void {
  registry.set(channel.id, channel);
}

export function getChannel(id: ChannelId): AdvertisingChannel | undefined {
  return registry.get(id);
}

export function listChannels(): AdvertisingChannel[] {
  return [...registry.values()];
}

/** For tests. */
export function clearChannels(): void {
  registry.clear();
}
