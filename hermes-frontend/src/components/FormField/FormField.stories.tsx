import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from './index';

const meta: Meta<typeof FormField> = {
  title: 'Components/FormField',
  component: FormField,
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'password', 'email', 'select'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const TextInput: Story = {
  args: {
    label: 'Full Name',
    type: 'text',
    value: '',
    placeholder: 'Enter your name',
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <FormField {...args} value={value} onChange={setValue} />;
  },
};

export const EmailInput: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    value: '',
    placeholder: 'name@example.com',
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <FormField {...args} value={value} onChange={setValue} />;
  },
};

export const PasswordInput: Story = {
  args: {
    label: 'Password',
    type: 'password',
    value: '',
    placeholder: 'Enter password',
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <FormField {...args} value={value} onChange={setValue} />;
  },
};

export const SelectField: Story = {
  args: {
    label: 'Status',
    type: 'select',
    value: '',
    placeholder: 'Select a status',
    options: [
      { label: 'New', value: 'new' },
      { label: 'Pending', value: 'pending' },
      { label: 'Contacted', value: 'contacted' },
      { label: 'Qualified', value: 'qualified' },
      { label: 'Rejected', value: 'rejected' },
    ],
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <FormField {...args} value={value} onChange={setValue} />;
  },
};

export const PrefilledText: Story = {
  args: {
    label: 'Company',
    type: 'text',
    value: 'Acme Corp',
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <FormField {...args} value={value} onChange={setValue} />;
  },
};

export const FormLayout: Story = {
  render: function Render() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
        <FormField label="Name" type="text" value={name} onChange={setName} placeholder="Full name" />
        <FormField label="Email" type="email" value={email} onChange={setEmail} placeholder="name@company.com" />
        <FormField
          label="Role"
          type="select"
          value={role}
          onChange={setRole}
          placeholder="Select role"
          options={[
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' },
          ]}
        />
      </div>
    );
  },
};
