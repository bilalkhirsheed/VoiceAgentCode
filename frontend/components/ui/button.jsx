const React = require('react');
const { cn } = require('../../lib/cn');

function Button({ className, variant = 'primary', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-crm border px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  const variants = {
    primary: 'border-crm-primary bg-crm-primary text-white hover:bg-[#1D4ED8]',
    secondary:
      'border-crm-border bg-white text-crm-text hover:bg-[#F9FAFB]',
    danger: 'border-crm-error bg-crm-error text-white hover:bg-[#B91C1C]',
    ghost: 'border-transparent bg-transparent text-crm-text hover:bg-[#F3F4F6]'
  };

  return React.createElement('button', {
    className: cn(base, variants[variant], className),
    ...props
  });
}

module.exports = { Button };

