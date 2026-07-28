import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ClaimStatusCard } from './claim-status-card';
import { AccountStatus } from '@/lib/api/types';

const meta: Meta<typeof ClaimStatusCard> = {
  title: 'Components/ClaimStatusCard',
  component: ClaimStatusCard,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ClaimStatusCard>;

export const Initializing: Story = {
  args: { status: AccountStatus.INITIALIZING },
};

export const PendingPayment: Story = {
  args: { status: AccountStatus.PENDING_PAYMENT },
};

export const Unclaimed: Story = {
  args: {
    status: AccountStatus.PENDING_CLAIM,
    amountStroops: '1000000000',
    assetCode: 'USDC',
    expiresAt: '2026-07-15T12:00:00Z',
  },
};

export const Claiming: Story = {
  args: { status: AccountStatus.CLAIMING },
};

export const PartialSweep: Story = {
  args: {
    status: AccountStatus.PARTIAL_SWEEP,
    sweepNote: 'Contract authorization succeeded; Horizon payment is retrying.',
  },
};

export const Claimed: Story = {
  args: { status: AccountStatus.CLAIMED },
};

export const Expired: Story = {
  args: {
    status: AccountStatus.EXPIRED,
    expiresAt: '2026-06-01T00:00:00Z',
    supportEmail: 'support@bridgelet.com',
  },
};

export const Failed: Story = {
  args: { status: AccountStatus.FAILED, supportEmail: 'support@bridgelet.com' },
};
