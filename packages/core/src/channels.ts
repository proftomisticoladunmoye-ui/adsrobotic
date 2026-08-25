import { prisma, type ChannelType } from '@adsrobotic/db';
import type { ChannelCredentials } from '@adsrobotic/channel-core';
import { buildAuthUrl, exchangeCodeForToken } from '@adsrobotic/channel-meta';
import {
  buildAuthUrl as buildGoogleAuthUrl,
  exchangeCodeForToken as exchangeGoogleCode,
} from '@adsrobotic/channel-google';
import { loadServerEnv } from '@adsrobotic/config';
import { AppError, validationError } from './errors';
import { encryptSecret, decryptSecret } from './crypto';
import { ensureAdaptersRegistered, getChannel } from './channels-registry';
import { audit } from './activity';

/** Whether the operator has configured Meta app credentials at all. */
export function isMetaConfigured(): boolean {
  const env = loadServerEnv();
  return Boolean(env.META_ADS_APP_ID && env.META_ADS_APP_SECRET);
}

/** Whether the operator has configured Google Ads credentials. */
export function isGoogleConfigured(): boolean {
  const env = loadServerEnv();
  return Boolean(
    env.GOOGLE_ADS_CLIENT_ID && env.GOOGLE_ADS_CLIENT_SECRET && env.GOOGLE_ADS_DEVELOPER_TOKEN,
  );
}

function redirectUri(channel: 'meta' | 'google'): string {
  const env = loadServerEnv();
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/v1/channels/${channel}/callback`;
}

function metaRedirectUri(): string {
  return redirectUri('meta');
}

/** Build the Meta OAuth URL the user is redirected to (Spec §21 consent). */
export function getMetaAuthUrl(state: string): string {
  const env = loadServerEnv();
  if (!env.META_ADS_APP_ID) throw new AppError('Meta is not configured', 400, 'not_configured');
  return buildAuthUrl({
    appId: env.META_ADS_APP_ID,
    redirectUri: metaRedirectUri(),
    state,
    version: env.META_GRAPH_VERSION,
  });
}

/**
 * Complete the Meta OAuth handshake: exchange the code for a token, confirm it
 * against a real ad account, and persist an encrypted connection (Spec §21 —
 * tokens are encrypted at rest and never returned to the client).
 */
export async function connectMetaFromCode(
  businessId: string,
  code: string,
  connectedById?: string,
): Promise<{ externalAccountId: string }> {
  ensureAdaptersRegistered();
  const env = loadServerEnv();
  if (!env.META_ADS_APP_ID || !env.META_ADS_APP_SECRET) {
    throw new AppError('Meta is not configured', 400, 'not_configured');
  }

  const tokenRes = await exchangeCodeForToken(
    { version: env.META_GRAPH_VERSION },
    {
      appId: env.META_ADS_APP_ID,
      appSecret: env.META_ADS_APP_SECRET,
      redirectUri: metaRedirectUri(),
      code,
    },
  );
  if (!tokenRes.ok) throw new AppError(`Meta token exchange failed: ${tokenRes.error}`, 400, 'oauth_error');

  const accessToken = tokenRes.data.access_token;
  const adapter = getChannel('meta');
  if (!adapter) throw new AppError('Meta adapter unavailable', 500, 'internal_error');

  const connect = await adapter.connectAccount({ accessToken });
  if (!connect.ok || !connect.externalAccountId) {
    throw new AppError(connect.error ?? 'Could not resolve a Meta ad account', 400, 'oauth_error');
  }

  await prisma.channelConnection.upsert({
    where: { businessId_channel: { businessId, channel: 'meta' } },
    update: {
      status: 'connected',
      externalAccountId: connect.externalAccountId,
      encryptedCredentials: encryptSecret(accessToken),
      scopes: connect.scopes ?? [],
      connectedById: connectedById ?? null,
      lastSyncedAt: new Date(),
    },
    create: {
      businessId,
      channel: 'meta',
      status: 'connected',
      externalAccountId: connect.externalAccountId,
      encryptedCredentials: encryptSecret(accessToken),
      scopes: connect.scopes ?? [],
      connectedById: connectedById ?? null,
    },
  });

  await audit({
    businessId,
    userId: connectedById,
    action: 'channel.connected',
    entityType: 'ChannelConnection',
    metadata: { channel: 'meta', externalAccountId: connect.externalAccountId },
  });

  return { externalAccountId: connect.externalAccountId };
}

/** Build the Google OAuth URL (offline access → refresh token). */
export function getGoogleAuthUrl(state: string): string {
  const env = loadServerEnv();
  if (!env.GOOGLE_ADS_CLIENT_ID) {
    throw new AppError('Google Ads is not configured', 400, 'not_configured');
  }
  return buildGoogleAuthUrl({
    clientId: env.GOOGLE_ADS_CLIENT_ID,
    redirectUri: redirectUri('google'),
    state,
  });
}

/**
 * Complete the Google OAuth handshake: exchange the code for a refresh token,
 * confirm it against a real Google Ads customer, and store the encrypted refresh
 * token (Spec §21). Google returns the refresh token only with offline/consent.
 */
export async function connectGoogleFromCode(
  businessId: string,
  code: string,
  connectedById?: string,
): Promise<{ externalAccountId: string }> {
  ensureAdaptersRegistered();
  const env = loadServerEnv();
  if (!env.GOOGLE_ADS_CLIENT_ID || !env.GOOGLE_ADS_CLIENT_SECRET) {
    throw new AppError('Google Ads is not configured', 400, 'not_configured');
  }

  const tokenRes = await exchangeGoogleCode(
    {},
    {
      clientId: env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: env.GOOGLE_ADS_CLIENT_SECRET,
      redirectUri: redirectUri('google'),
      code,
    },
  );
  if (!tokenRes.ok) throw new AppError(`Google token exchange failed: ${tokenRes.error}`, 400, 'oauth_error');
  const refreshToken = tokenRes.data.refresh_token;
  if (!refreshToken) {
    throw new AppError(
      'Google did not return a refresh token. Remove AdsRobotic from your Google account permissions and reconnect.',
      400,
      'oauth_error',
    );
  }

  const adapter = getChannel('google');
  if (!adapter) throw new AppError('Google adapter unavailable', 500, 'internal_error');
  const connect = await adapter.connectAccount({ refreshToken });
  if (!connect.ok || !connect.externalAccountId) {
    throw new AppError(connect.error ?? 'Could not resolve a Google Ads account', 400, 'oauth_error');
  }

  await prisma.channelConnection.upsert({
    where: { businessId_channel: { businessId, channel: 'google' } },
    update: {
      status: 'connected',
      externalAccountId: connect.externalAccountId,
      encryptedCredentials: encryptSecret(refreshToken),
      scopes: connect.scopes ?? [],
      connectedById: connectedById ?? null,
      lastSyncedAt: new Date(),
    },
    create: {
      businessId,
      channel: 'google',
      status: 'connected',
      externalAccountId: connect.externalAccountId,
      encryptedCredentials: encryptSecret(refreshToken),
      scopes: connect.scopes ?? [],
      connectedById: connectedById ?? null,
    },
  });

  await audit({
    businessId,
    userId: connectedById,
    action: 'channel.connected',
    entityType: 'ChannelConnection',
    metadata: { channel: 'google', externalAccountId: connect.externalAccountId },
  });

  return { externalAccountId: connect.externalAccountId };
}

export async function listConnections(businessId: string) {
  return prisma.channelConnection.findMany({
    where: { businessId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      channel: true,
      status: true,
      externalAccountId: true,
      scopes: true,
      lastSyncedAt: true,
    },
  });
}

export async function disconnectChannel(businessId: string, channel: ChannelType) {
  await prisma.channelConnection.updateMany({
    where: { businessId, channel },
    data: { status: 'disconnected', encryptedCredentials: null },
  });
}

/**
 * Resolve decrypted credentials for a business's channel connection. Returns
 * null when there is no connected account — callers must handle that rather than
 * proceeding without authority.
 */
export async function resolveChannelCredentials(
  businessId: string,
  channel: ChannelType,
): Promise<ChannelCredentials | null> {
  const conn = await prisma.channelConnection.findFirst({
    where: { businessId, channel, status: 'connected' },
  });
  if (!conn?.encryptedCredentials) return null;
  const secret = decryptSecret(conn.encryptedCredentials);
  // Google stores a long-lived refresh token; the adapter mints access tokens
  // from it. Meta stores a (long-lived) access token directly.
  const creds: ChannelCredentials = channel === 'google' ? { refreshToken: secret } : { accessToken: secret };
  if (conn.externalAccountId) creds.externalAccountId = conn.externalAccountId;
  return creds;
}

/** For the wizard/UI: which channels are available to connect right now. */
export function availableChannels(): Array<{ channel: ChannelType; label: string; configured: boolean }> {
  return [
    { channel: 'meta', label: 'Meta (Facebook & Instagram)', configured: isMetaConfigured() },
    { channel: 'google', label: 'Google Ads', configured: isGoogleConfigured() },
  ];
}

export { validationError };
