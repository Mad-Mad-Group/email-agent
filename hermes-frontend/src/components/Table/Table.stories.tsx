import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Table } from './index';
import { StatusBadge } from '../StatusBadge/index';

const meta: Meta<typeof Table> = {
  title: 'Components/Table',
  component: Table,
};

export default meta;
type Story = StoryObj<typeof Table>;

const sampleColumns = [
  { key: 'name', label: 'Name', width: '30%' },
  { key: 'email', label: 'Email', width: '30%' },
  { key: 'status', label: 'Status', width: '20%' },
  { key: 'date', label: 'Date', width: '20%' },
];

const sampleData = [
  { name: 'Alice Johnson', email: 'alice@example.com', status: 'new', date: '2026-06-20' },
  { name: 'Bob Smith', email: 'bob@example.com', status: 'contacted', date: '2026-06-19' },
  { name: 'Carol White', email: 'carol@example.com', status: 'qualified', date: '2026-06-18' },
  { name: 'Dave Brown', email: 'dave@example.com', status: 'rejected', date: '2026-06-17' },
  { name: 'Eve Davis', email: 'eve@example.com', status: 'pending', date: '2026-06-16' },
];

export const Default: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
  },
};

export const WithCustomRenderCell: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    renderCell: (key: string, value: any) => {
      if (key === 'status') {
        return <StatusBadge status={value} />;
      }
      return value;
    },
  },
};

export const EmptyTable: Story = {
  args: {
    columns: sampleColumns,
    data: [],
  },
};

export const SingleRow: Story = {
  args: {
    columns: sampleColumns,
    data: [sampleData[0]],
  },
};

export const ManyRows: Story = {
  args: {
    columns: sampleColumns,
    data: Array.from({ length: 20 }, (_, i) => ({
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      status: ['new', 'pending', 'contacted', 'rejected', 'qualified'][i % 5],
      date: `2026-06-${String(25 - (i % 25)).padStart(2, '0')}`,
    })),
  },
};
