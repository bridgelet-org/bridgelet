import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PageShell } from './page-shell';

const meta: Meta<typeof PageShell> = {
  title: 'Components/PageShell',
  component: PageShell,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof PageShell>;

export const Default: Story = {
  args: {
    title: 'Page Title',
    description: 'A short description of this page.',
    children: <p>Page content goes here.</p>,
  },
};

export const NoChildren: Story = {
  args: {
    title: 'Empty Page',
    description: 'No content provided.',
  },
};
