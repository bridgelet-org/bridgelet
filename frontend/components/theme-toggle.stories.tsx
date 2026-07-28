import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div className="flex items-center justify-center p-8">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {};
