import { prisma, type User } from '@adsrobotic/db';
import { hashPassword, verifyPassword } from './password';
import { authError, conflictError, validationError } from './errors';
import { uniqueSlug } from './slug';

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  /** The business the user is signing up to advertise. */
  businessName: string;
}

export interface RegisterResult {
  user: User;
  organizationId: string;
  businessId: string;
}

/**
 * Register a new advertiser. Provisions the whole starting tenant in one
 * transaction (Spec §19): a User, their Organization, the first Business (with
 * an empty Business Brain profile and a zeroed ad wallet), and an `org_owner`
 * Membership. Idempotency is guarded by the unique email.
 */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes('@')) throw validationError('A valid email is required');
  if (!input.businessName.trim()) throw validationError('A business name is required');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflictError('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: input.name?.trim() || null,
        status: 'active',
      },
    });

    const org = await tx.organization.create({
      data: {
        name: input.businessName.trim(),
        slug: uniqueSlug(input.businessName),
        type: 'business',
      },
    });

    const business = await tx.business.create({
      data: {
        organizationId: org.id,
        name: input.businessName.trim(),
        slug: uniqueSlug(input.businessName),
        brainStage: 'new',
        autonomyLevel: 'assistant',
        profile: { create: {} },
        wallet: { create: {} },
      },
    });

    await tx.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'org_owner' },
    });

    return { user, organizationId: org.id, businessId: business.id };
  });
}

/** Verify credentials, returning the user or throwing an auth error. */
export async function authenticate(email: string, password: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  // Always run a verify to keep timing roughly constant even when the user is
  // absent (mitigates account enumeration).
  const digest = user?.passwordHash ?? '$argon2id$v=19$m=19456,t=2,p=1$xxxxxxxxxxxxxxxx$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const okPassword = await verifyPassword(digest, password);
  if (!user || !okPassword) throw authError();
  if (user.status === 'suspended') throw authError('This account is suspended');
  return user;
}
