import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ClaimStatusCard } from './claim-status-card';

const meta: Meta<typeof ClaimStatusCard> = {
  title: 'Components/ClaimStatusCard',
  component: ClaimStatusCard,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ClaimStatusCard>;

export const Available: Story = {
  args: { status: 'available', amountStroops: '1000000000', assetCode: 'USDC', expiresAt: '2026-07-15T12:00:00Z' },
};

export const Claimed: Story = {
  args: { status: 'claimed' },
};

export const Expired: Story = {
  args: { status: 'expired', expiresAt: '2026-06-01T00:00:00Z', supportEmail: 'support@bridgelet.com' },
};