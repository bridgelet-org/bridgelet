import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CTABanner } from './cta-banner';

const meta: Meta<typeof CTABanner> = {
  title: 'Components/CTABanner',
  component: CTABanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof CTABanner>;

export const Default: Story = {};
