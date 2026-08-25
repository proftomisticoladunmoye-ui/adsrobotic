import { prisma, type LeadStatus, type Prisma } from '@adsrobotic/db';
import { notFoundError, validationError } from './errors';
import { recordActivity } from './activity';

/**
 * Leads inbox (Spec §14, Engine 5). Leads flow in from Smart Pages, WhatsApp,
 * and forms; this is where a business works them through the funnel:
 * new → contacted → qualified → converted (or disqualified). Converting a lead
 * with a value records a Sale + Conversion so real revenue joins the outcome
 * model (Spec §1, §28 — actual, never estimated).
 */

export interface LeadListItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  destination: string;
  status: LeadStatus;
  qualified: boolean;
  value: number | null;
  campaignName: string | null;
  createdAt: Date;
}

export async function listLeads(
  businessId: string,
  opts: { status?: LeadStatus; campaignId?: string } = {},
): Promise<LeadListItem[]> {
  const where: Prisma.LeadWhereInput = { businessId };
  if (opts.status) where.status = opts.status;
  if (opts.campaignId) where.campaignId = opts.campaignId;

  const rows = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { campaign: { select: { name: true } } },
    take: 200,
  });

  return rows.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    message: l.message,
    destination: l.destination,
    status: l.status,
    qualified: l.qualified,
    value: l.value ? Number(l.value) : null,
    campaignName: l.campaign?.name ?? null,
    createdAt: l.createdAt,
  }));
}

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  disqualified: number;
}

export async function getLeadStats(businessId: string): Promise<LeadStats> {
  const grouped = await prisma.lead.groupBy({
    by: ['status'],
    where: { businessId },
    _count: { _all: true },
  });
  const stats: LeadStats = { total: 0, new: 0, contacted: 0, qualified: 0, converted: 0, disqualified: 0 };
  for (const g of grouped) {
    const n = g._count._all;
    stats.total += n;
    stats[g.status] = n;
  }
  return stats;
}

const QUALIFIED_STATES: LeadStatus[] = ['qualified', 'converted'];

/** Move a lead through the funnel. `qualified` is kept consistent with status. */
export async function setLeadStatus(
  businessId: string,
  leadId: string,
  status: LeadStatus,
): Promise<void> {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, businessId } });
  if (!lead) throw notFoundError('Lead not found');
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status, qualified: QUALIFIED_STATES.includes(status) },
  });
}

/**
 * Convert a lead into a customer. Marks it converted and, when a value is given,
 * records a Sale + a customer Conversion (actual). This is how tracked revenue
 * enters the funnel — only ever from a real, user-confirmed conversion.
 */
export async function convertLead(
  businessId: string,
  leadId: string,
  value?: number,
): Promise<void> {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, businessId } });
  if (!lead) throw notFoundError('Lead not found');
  if (value !== undefined && !(value >= 0)) throw validationError('Value must be zero or more');

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: 'converted', qualified: true, ...(value !== undefined ? { value } : {}) },
    });
    if (value && value > 0) {
      await tx.sale.create({
        data: {
          businessId,
          campaignId: lead.campaignId,
          leadId: lead.id,
          amount: value,
          currency: 'USD',
        },
      });
      await tx.conversion.create({
        data: {
          businessId,
          campaignId: lead.campaignId,
          leadId: lead.id,
          type: 'customer',
          value,
          source: 'actual',
        },
      });
    }
  });

  await recordActivity({
    businessId,
    campaignId: lead.campaignId ?? undefined,
    type: 'analysis',
    summary: `Lead ${lead.name ?? lead.phone ?? lead.email ?? leadId} marked converted${
      value && value > 0 ? ` (${value} USD)` : ''
    }.`,
  });
}
