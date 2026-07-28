import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SkeletonLoader } from './skeleton-loader';

const meta: Meta<typeof SkeletonLoader> = {
  title: 'Components/SkeletonLoader',
  component: SkeletonLoader,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof SkeletonLoader>;

export const Default: Story = {};

export const WithHeader: Story = {
  args: { showHeader: true, rows: 3 },
};

export const ManyRows: Story = {
  args: { rows: 6 },
};
