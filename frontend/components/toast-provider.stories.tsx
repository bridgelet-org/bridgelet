import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ToastProvider, useToast } from './toast-provider';
import { ToastNotification } from './toast-notification';

function DemoButtons() {
  const { showToast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => showToast('Payment sent successfully.', 'success')}>Success</button>
      <button onClick={() => showToast('Transaction failed.', 'error')}>Error</button>
      <button onClick={() => showToast('Claim link expires soon.', 'warning')}>Warning</button>
      <button onClick={() => showToast('Processing your request…', 'info')}>Info</button>
    </div>
  );
}

const meta: Meta<typeof ToastProvider> = {
  title: 'Components/ToastProvider',
  component: ToastProvider,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ToastProvider>;

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <DemoButtons />
    </ToastProvider>
  ),
};
