const nodemailer = require('nodemailer');

const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Voice Agent CRM';
const FROM_EMAIL = process.env.EMAIL_FROM_EMAIL || process.env.SMTP_USER || 'noreply@example.com';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port: port ? parseInt(port, 10) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass }
  });
}

/**
 * Send email. No-op if SMTP not configured. Logs errors, does not throw.
 * fromName (optional): e.g. dealer name for customer emails, or "Voice Agent" for dealer emails.
 */
async function sendMail({ to, subject, html, text, fromName }) {
  const transport = getTransporter();
  if (!transport) {
    console.warn('[Email] SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS). Skip sending.');
    return;
  }
  const name = fromName != null && fromName !== '' ? fromName : FROM_NAME;
  try {
    await transport.sendMail({
      from: `"${name}" <${FROM_EMAIL}>`,
      to,
      subject,
      html: html || text,
      text: text || (html ? html.replace(/<[^>]+>/g, '') : '')
    });
    console.log('[Email] Sent:', { to, subject });
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
  }
}

/**
 * Customer: one email = request/callback confirmation + we'll get back to you.
 */
function buildCustomerRequestReceived({
  dealerName,
  customerName,
  requestType = null,
  isServiceBooking = false,
  appointmentDate,
  appointmentTime
}) {
  const greeting = customerName ? `Dear ${customerName},` : 'Dear Customer,';
  const rt = String(requestType || '').toLowerCase();
  const typeLabel = rt === 'sales' ? 'sales' : rt === 'parts' ? 'parts' : rt === 'service' ? 'service' : 'request';
  const hasAppointment = isServiceBooking && (appointmentDate || appointmentTime);
  const appointmentLine = hasAppointment
    ? `Your ${typeLabel} appointment is confirmed for ${[appointmentDate, appointmentTime].filter(Boolean).join(' at ')}. `
    : '';
  const body = `${appointmentLine}${dealerName} will get back to you shortly if we need anything else. Thank you for contacting us.`;
  const subject = hasAppointment
    ? `Booking confirmation – ${dealerName}`
    : `We've received your ${typeLabel} request – ${dealerName}`;
  const subhead = hasAppointment ? 'Booking confirmation' : `${typeLabel.charAt(0).toUpperCase()} request received`;
  return {
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#111;color:#fff;padding:20px 24px">
      <div style="font-size:18px;font-weight:600">${escapeHtml(dealerName)}</div>
      <div style="font-size:13px;opacity:0.9;margin-top:4px">${subhead}</div>
    </div>
    <div style="padding:28px 24px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333">${greeting}</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333">${body}</p>
    </div>
    <div style="padding:16px 24px;background:#f9f9f9;font-size:12px;color:#888">This is an automated message. Please do not reply directly to this email.</div>
  </div>
</body>
</html>`,
    text: `${greeting}\n\n${body}`
  };
}

/**
 * Dealer: new request (sales/service/parts) waiting in CRM.
 */
function buildDealerNewRequest({
  dealerName,
  customerName,
  customerPhone,
  customerEmail,
  summary,
  requestType = null,
  isServiceBooking = false,
  appointmentDate,
  appointmentTime,
  vehicleInfo
}) {
  const rt = String(requestType || '').toLowerCase();
  const title =
    rt === 'sales' ? 'New sales request'
      : rt === 'parts' ? 'New parts request'
        : isServiceBooking || rt === 'service' ? 'New service request'
          : isServiceBooking ? 'New service booking'
            : 'New request received';
  const lines = [];
  if (customerName) lines.push(`Customer: ${customerName}`);
  if (customerPhone) lines.push(`Phone: ${customerPhone}`);
  if (customerEmail) lines.push(`Email: ${customerEmail}`);
  if (summary) lines.push(`Summary: ${summary}`);
  if (isServiceBooking && (appointmentDate || appointmentTime)) lines.push(`Requested: ${[appointmentDate, appointmentTime].filter(Boolean).join(' at ')}`);
  if (vehicleInfo) lines.push(`Vehicle: ${vehicleInfo}`);
  const details = lines.join('\n');
  return {
    subject: `${title} – ${customerName || 'Customer'}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#1e40af;color:#fff;padding:20px 24px">
      <div style="font-size:18px;font-weight:600">${title}</div>
      <div style="font-size:13px;opacity:0.9;margin-top:4px">${escapeHtml(dealerName)}</div>
    </div>
    <div style="padding:28px 24px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333">A new request has been received and is waiting in your CRM.</p>
      <div style="background:#f8fafc;border-radius:6px;padding:16px;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap">${escapeHtml(details)}</div>
      <p style="margin:20px 0 0;font-size:14px;color:#666">Log in to your CRM to view full details and follow up.</p>
    </div>
    <div style="padding:16px 24px;background:#f9f9f9;font-size:12px;color:#888">Voice Agent CRM – automated notification</div>
  </div>
</body>
</html>`,
    text: `${title}\n\n${details}\n\nLog in to your CRM to view full details and follow up.`
  };
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Customer: callback request received – we'll get back to you. */
function buildCustomerCallbackReceived({ dealerName, customerName, requestType = null }) {
  const greeting = customerName ? `Dear ${customerName},` : 'Dear Customer,';
  const rt = String(requestType || '').toLowerCase();
  const typeLabel = rt === 'sales' ? 'sales' : rt === 'parts' ? 'parts' : rt === 'service' ? 'service' : 'your request';
  const body = `We have received your callback request for ${typeLabel}. ${dealerName} will get back to you shortly. Thank you for contacting us.`;
  return {
    subject: `Callback request received – ${dealerName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#111;color:#fff;padding:20px 24px">
      <div style="font-size:18px;font-weight:600">${escapeHtml(dealerName)}</div>
      <div style="font-size:13px;opacity:0.9;margin-top:4px">Callback request received</div>
    </div>
    <div style="padding:28px 24px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333">${greeting}</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333">${body}</p>
    </div>
    <div style="padding:16px 24px;background:#f9f9f9;font-size:12px;color:#888">This is an automated message. Please do not reply directly to this email.</div>
  </div>
</body>
</html>`,
    text: `${greeting}\n\n${body}`
  };
}

/** Dealer: new callback request from customer. */
function buildDealerCallbackRequest({ dealerName, customerName, customerPhone, customerEmail, summary, requestType = null }) {
  const lines = [];
  if (customerName) lines.push(`Customer: ${customerName}`);
  if (customerPhone) lines.push(`Phone: ${customerPhone}`);
  if (customerEmail) lines.push(`Email: ${customerEmail}`);
  if (summary) lines.push(`Summary: ${summary}`);
  const details = lines.length ? lines.join('\n') : 'No details captured.';
  const rt = String(requestType || '').toLowerCase();
  const typeLabel = rt === 'sales' ? 'sales' : rt === 'parts' ? 'parts' : rt === 'service' ? 'service' : 'their request';
  return {
    subject: `New callback request – ${typeLabel} – ${customerName || 'Customer'}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#059669;color:#fff;padding:20px 24px">
      <div style="font-size:18px;font-weight:600">New callback request</div>
      <div style="font-size:13px;opacity:0.9;margin-top:4px">${escapeHtml(dealerName)}</div>
    </div>
    <div style="padding:28px 24px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333">A customer has requested a callback for ${typeLabel}. Please follow up.</p>
      <div style="background:#f8fafc;border-radius:6px;padding:16px;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap">${escapeHtml(details)}</div>
    </div>
    <div style="padding:16px 24px;background:#f9f9f9;font-size:12px;color:#888">Voice Agent CRM – automated notification</div>
  </div>
</body>
</html>`,
    text: `New callback request\n\n${details}`
  };
}

/** Customer: call disconnected – we'll get back to you. */
function buildCustomerHangupReceived({ dealerName, customerName }) {
  const greeting = customerName ? `Dear ${customerName},` : 'Dear Customer,';
  const body =
    `It looks like your recent call with ${dealerName} was cut off before we could finish.\n\n` +
    `No worries — our team has your details and will be reaching out to you shortly to follow up on your request.\n\n` +
    `If you'd like to share any extra information in the meantime, you can reply to this email and we'll make sure it reaches the right person.`;
  return {
    subject: `We noticed your call was cut off – ${dealerName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#111;color:#fff;padding:20px 24px">
      <div style="font-size:18px;font-weight:600">${escapeHtml(dealerName)}</div>
      <div style="font-size:13px;opacity:0.9;margin-top:4px">Call disconnected</div>
    </div>
    <div style="padding:28px 24px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333">${greeting}</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333">
        It looks like your recent call with <strong>${escapeHtml(
          dealerName
        )}</strong> was cut off before we could finish.
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333">
        <strong>No worries — our team has your details and will be reaching out to you shortly</strong> to follow up on your request.
      </p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#333">
        If you'd like to share any extra information in the meantime, you can reply to this email and we'll make sure it reaches the right person.
      </p>
    </div>
    <div style="padding:16px 24px;background:#f9f9f9;font-size:12px;color:#888">Voice Agent CRM – automated notification</div>
  </div>
</body>
</html>`,
    text: `${greeting}\n\n${body}`
  };
}

/** Dealer: user hung up – follow up. */
function buildDealerHangupAlert({ dealerName, customerName, customerPhone, customerEmail, summary }) {
  const lines = [];
  if (customerName) lines.push(`Customer: ${customerName}`);
  if (customerPhone) lines.push(`Phone: ${customerPhone}`);
  if (customerEmail) lines.push(`Email: ${customerEmail}`);
  if (summary) lines.push(`Summary: ${summary}`);
  const details = lines.length ? lines.join('\n') : 'No details captured.';
  return {
    subject: `User hung up – ${customerName || 'Caller'}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#b45309;color:#fff;padding:20px 24px">
      <div style="font-size:18px;font-weight:600">User hung up</div>
      <div style="font-size:13px;opacity:0.9;margin-top:4px">${escapeHtml(dealerName)} – consider following up</div>
    </div>
    <div style="padding:28px 24px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333">The caller ended the call. You may want to follow up.</p>
      <div style="background:#f8fafc;border-radius:6px;padding:16px;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap">${escapeHtml(details)}</div>
    </div>
    <div style="padding:16px 24px;background:#f9f9f9;font-size:12px;color:#888">Voice Agent CRM – automated notification</div>
  </div>
</body>
</html>`,
    text: `User hung up\n\n${details}`
  };
}

/**
 * Send "request received" to customer and "new request" to dealer (e.g. after service booking).
 */
async function notifyRequestReceived(options) {
  const {
    dealerName,
    dealerEmail,
    customerName,
    customerEmail,
    customerPhone,
    summary,
    requestType = null,
    isServiceBooking = false,
    appointmentDate,
    appointmentTime,
    vehicleMake,
    vehicleModel,
    vehicleYear
  } = options;

  const vehicleInfo = [vehicleMake, vehicleModel, vehicleYear].filter(Boolean).join(' ') || null;

  if (customerEmail) {
    const cust = buildCustomerRequestReceived({
      dealerName,
      customerName,
      requestType,
      isServiceBooking,
      appointmentDate,
      appointmentTime
    });
    await sendMail({ to: customerEmail, ...cust, fromName: dealerName || FROM_NAME });
  }

  if (dealerEmail) {
    const dealer = buildDealerNewRequest({
      dealerName,
      customerName,
      customerPhone,
      customerEmail,
      summary,
      requestType,
      isServiceBooking,
      appointmentDate,
      appointmentTime,
      vehicleInfo
    });
    await sendMail({ to: dealerEmail, ...dealer, fromName: FROM_NAME });
  }
}

/** Send callback-request emails to customer and dealer. */
async function notifyCallbackRequestReceived({ dealerName, dealerEmail, customerName, customerEmail, customerPhone, summary, requestType = null }) {
  if (customerEmail) {
    const cust = buildCustomerCallbackReceived({ dealerName, customerName, requestType });
    await sendMail({ to: customerEmail, ...cust, fromName: dealerName || FROM_NAME });
  }
  if (dealerEmail) {
    const dealer = buildDealerCallbackRequest({ dealerName, customerName, customerPhone, customerEmail, summary, requestType });
    await sendMail({ to: dealerEmail, ...dealer, fromName: FROM_NAME });
  }
}

/** Send user-hangup emails to customer and dealer. */
async function notifyUserHangup({ dealerName, dealerEmail, customerName, customerEmail, customerPhone, summary }) {
  if (customerEmail) {
    const cust = buildCustomerHangupReceived({ dealerName, customerName });
    await sendMail({ to: customerEmail, ...cust, fromName: dealerName || FROM_NAME });
  }
  if (dealerEmail) {
    const dealer = buildDealerHangupAlert({ dealerName, customerName, customerPhone, customerEmail, summary });
    await sendMail({ to: dealerEmail, ...dealer, fromName: FROM_NAME });
  }
}

function buildDealerTransferFailed({
  dealerName,
  customerName,
  customerPhone,
  customerEmail,
  summary,
  requestType = null
}) {
  const rt = String(requestType || '').toLowerCase();
  const typeLabel = rt === 'sales' ? 'sales' : rt === 'parts' ? 'parts' : rt === 'service' ? 'service' : 'your request';

  const lines = [];
  if (customerName) lines.push(`Customer: ${customerName}`);
  if (customerPhone) lines.push(`Phone: ${customerPhone}`);
  if (customerEmail) lines.push(`Email: ${customerEmail}`);
  if (summary) lines.push(`Summary: ${summary}`);
  const details = lines.length ? lines.join('\n') : 'No details captured.';

  return {
    subject: `Transfer failed – ${typeLabel} – ${dealerName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#dc2626;color:#fff;padding:20px 24px">
      <div style="font-size:18px;font-weight:600">Transfer failed</div>
      <div style="font-size:13px;opacity:0.9;margin-top:4px">${escapeHtml(dealerName)} – ${escapeHtml(typeLabel)}</div>
    </div>
    <div style="padding:28px 24px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333">
        We could not connect the call to the ${escapeHtml(typeLabel)} team.
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333">
        Please follow up with the customer using the details below.
      </p>
      <div style="background:#f8fafc;border-radius:6px;padding:16px;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap">${escapeHtml(details)}</div>
    </div>
    <div style="padding:16px 24px;background:#f9f9f9;font-size:12px;color:#888">Voice Agent CRM – automated notification</div>
  </div>
</body>
</html>`,
    text: `Transfer failed – ${typeLabel}\n\n${details}`
  };
}

function buildCustomerTransferFailedReceived({ dealerName, customerName, requestType = null }) {
  const rt = String(requestType || '').toLowerCase();
  const typeLabel = rt === 'sales' ? 'sales' : rt === 'parts' ? 'parts' : rt === 'service' ? 'service' : 'your request';
  const greeting = customerName ? `Dear ${customerName},` : 'Dear Customer,';
  const body = `We couldn't connect your call to the ${typeLabel} team. Our dealership will follow up with you shortly to assist you with next steps. Thank you for calling ${dealerName}.`;
  return {
    subject: `We couldn't connect your transfer – ${dealerName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;font-family:Segoe UI,Helvetica,Arial,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="background:#dc2626;color:#fff;padding:20px 24px">
      <div style="font-size:18px;font-weight:600">Transfer failed</div>
      <div style="font-size:13px;opacity:0.9;margin-top:4px">${escapeHtml(dealerName)} – ${escapeHtml(typeLabel)}</div>
    </div>
    <div style="padding:28px 24px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333">${greeting}</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333">${escapeHtml(body)}</p>
      <p style="margin:0;font-size:12px;color:#888">This is an automated message. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>`,
    text: `${greeting}\n\n${body}`
  };
}

async function notifyTransferFailed({
  dealerName,
  dealerEmail,
  customerName,
  customerEmail,
  customerPhone,
  summary,
  requestType = null
}) {
  if (customerEmail) {
    const cust = buildCustomerTransferFailedReceived({ dealerName, customerName, requestType });
    await sendMail({ to: customerEmail, ...cust, fromName: dealerName || FROM_NAME });
  }
  if (dealerEmail) {
    const dealer = buildDealerTransferFailed({
      dealerName,
      customerName,
      customerPhone,
      customerEmail,
      summary,
      requestType
    });
    await sendMail({ to: dealerEmail, ...dealer, fromName: FROM_NAME });
  }
}

module.exports = {
  sendMail,
  notifyRequestReceived,
  notifyCallbackRequestReceived,
  notifyUserHangup,
  notifyTransferFailed
};
