import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './index';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  argTypes: {
    status: {
      control: 'select',
      options: ['new', 'pending', 'contacted', 'rejected', 'qualified', 'draft', 'approved', 'sent'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const New: Story = {
  args: { status: 'new' },
};

export const Pending: Story = {
  args: { status: 'pending' },
};

export const Contacted: Story = {
  args: { status: 'contacted' },
};

export const Rejected: Story = {
  args: { status: 'rejected' },
};

export const Qualified: Story = {
  args: { status: 'qualified' },
};

export const Draft: Story = {
  args: { status: 'draft' },
};

export const Approved: Story = {
  args: { status: 'approved' },
};

export const Sent: Story = {
  args: { status: 'sent' },
};

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <StatusBadge status="new" />
      <StatusBadge status="pending" />
      <StatusBadge status="contacted" />
      <StatusBadge status="rejected" />
      <StatusBadge status="qualified" />
      <StatusBadge status="draft" />
      <StatusBadge status="approved" />
      <StatusBadge status="sent" />
    </div>
  ),
};
