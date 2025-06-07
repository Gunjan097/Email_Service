const EmailService = require('./service');

describe('EmailService', () => {
  let emailService;

  beforeEach(() => {
    emailService = new EmailService();
  });

  test('should send an email and track status', async () => {
    const email = { id: 'email1', to: 'user1@example.com', subject: 'Hello', body: 'World' };
    const status = await emailService.sendEmail(email);
    expect(['Provider1 success', 'Provider2 success', 'Failed']).toContain(status);
    expect(emailService.getStatus(email.id)).toBe(status);
  });

  test('should prevent duplicate sends with idempotency', async () => {
    const email = { id: 'email2', to: 'user2@example.com', subject: 'Hi', body: 'There' };
    const status1 = await emailService.sendEmail(email);
    const status2 = await emailService.sendEmail(email);
    expect(status2).toBe(status1);
  });

  test('should respect rate limiting', async () => {
    const emails = [
      { id: 'email3', to: 'user3@example.com', subject: 'Hi', body: 'One' },
      { id: 'email4', to: 'user4@example.com', subject: 'Hi', body: 'Two' },
      { id: 'email5', to: 'user5@example.com', subject: 'Hi', body: 'Three' },
    ];

    // Send 2 emails quickly, should succeed or fail normally
    const status1 = await emailService.sendEmail(emails[0]);
    const status2 = await emailService.sendEmail(emails[1]);
    expect(['Provider1 success', 'Provider2 success', 'Failed']).toContain(status1);
    expect(['Provider1 success', 'Provider2 success', 'Failed']).toContain(status2);

    // Third one should be rejected by rate limiting
    const status3 = await emailService.sendEmail(emails[2]);
    expect(status3).toBe('Failed - Rate Limit');
  });
});
