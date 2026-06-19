/**
 * Unit tests for memberApprovalEmail — verifies the admin's rejection reason is
 * surfaced (and HTML-escaped) in rejection emails, and never leaks into approval
 * emails.
 */
const { memberApprovalEmail } = require('../../src/utils/emailTemplates');

describe('memberApprovalEmail — rejection reason', () => {
  it('renders the rejection reason in a rejected email', () => {
    const html = memberApprovalEmail(
      'jane doe',
      'rejected',
      'Acme Lending',
      null,
      'Out of quota for this cycle',
    );
    expect(html).toContain('Reason for rejection');
    expect(html).toContain('Out of quota for this cycle');
  });

  it('escapes HTML in the reason to prevent injection', () => {
    const html = memberApprovalEmail(
      'jane doe',
      'rejected',
      null,
      null,
      '<script>alert(1)</script>',
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('omits the reason block when no reason is provided', () => {
    const html = memberApprovalEmail('jane doe', 'rejected', null, null, '');
    expect(html).not.toContain('Reason for rejection');
  });

  it('never shows a rejection reason on an approved email', () => {
    const html = memberApprovalEmail(
      'jane doe',
      'approved',
      null,
      null,
      'should be ignored',
    );
    expect(html).not.toContain('Reason for rejection');
    expect(html).not.toContain('should be ignored');
    // Approved emails keep the portal CTA.
    expect(html).toContain('Login to Member Portal');
  });
});
