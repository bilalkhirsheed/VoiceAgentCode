const React = require('react');
const { cn } = require('../../lib/cn');

function Input({ className, ...props }) {
  return React.createElement('input', {
    className: cn(
      'h-9 w-full rounded-crm border border-crm-border bg-white px-3 text-[13px] text-crm-text placeholder:text-crm-muted focus:outline-none focus:ring-2 focus:ring-crm-primary/30',
      className
    ),
    ...props
  });
}

module.exports = { Input };

