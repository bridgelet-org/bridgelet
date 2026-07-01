import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WalletAddressInput } from './wallet-address-input';

const meta: Meta<typeof WalletAddressInput> = {
  title: 'Components/WalletAddressInput',
  component: WalletAddressInput,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof WalletAddressInput>;

export const Empty: Story = {
  args: { value: '', onChange: () => {} },
};

export const ValidAddress: Story = {
  args: {
    value: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    onChange: () => {},
  },
};

export const WithError: Story = {
  args: {
    value: 'not-a-valid-key',
    onChange: () => {},
    error: 'Enter a valid Stellar public key (starts with G, 56 characters).',
  },
};

export const Disabled: Story = {
  args: {
    value: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    onChange: () => {},
    disabled: true,
  },
};
