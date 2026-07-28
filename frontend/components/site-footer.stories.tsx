import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SiteFooter } from './site-footer';

const meta: Meta<typeof SiteFooter> = {
  title: 'Components/SiteFooter',
  component: SiteFooter,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof SiteFooter>;

export const Default: Story = {};
