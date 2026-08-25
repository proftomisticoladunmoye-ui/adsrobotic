import { registerChannel, getChannel, MockChannel } from '@adsrobotic/channel-core';
import { MetaChannel } from '@adsrobotic/channel-meta';
import { GoogleChannel } from '@adsrobotic/channel-google';
import { loadServerEnv } from '@adsrobotic/config';

/**
 * Register every available advertising channel adapter (Spec §4). Idempotent —
 * safe to call from each process entrypoint (web routes, the worker). Adapters
 * are always registered; whether they can actually transact is gated per call by
 * the presence of a connected account's credentials.
 */
let done = false;

export function ensureAdaptersRegistered(): void {
  if (done) return;
  registerChannel(new MockChannel());
  const env = loadServerEnv();
  registerChannel(new MetaChannel({ version: env.META_GRAPH_VERSION }));
  registerChannel(
    new GoogleChannel({
      version: env.GOOGLE_ADS_API_VERSION,
      developerToken: env.GOOGLE_ADS_DEVELOPER_TOKEN,
      clientId: env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: env.GOOGLE_ADS_CLIENT_SECRET,
      ...(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
        ? { loginCustomerId: env.GOOGLE_ADS_LOGIN_CUSTOMER_ID }
        : {}),
    }),
  );
  done = true;
}

export { getChannel };
