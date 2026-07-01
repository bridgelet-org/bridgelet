import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ToastNotification } from './toast-notification';

const meta: Meta<typeof ToastNotification> = {
  title: 'Components/ToastNotification',
  component: ToastNotification,
  tags: ['autodocs'],
  args: { duration: 0 }, // disable auto-dismiss in stories
};
export default meta;

type Story = StoryObj<typeof ToastNotification>;

export const Success: Story = {
  args: { message: 'Payment claim submitted successfully.', variant: 'success' },
};

export const Error: Story = {
  args: { message: 'Something went wrong. Please try again.', variant: 'error' },
};

export const Info: Story = {
  args: { message: 'Your claim link will expire in 24 hours.', variant: 'info' },
};
