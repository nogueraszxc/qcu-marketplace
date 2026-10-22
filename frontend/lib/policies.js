export const policyVersion = '2026-10-22';
export const policyLinks = { terms: '/terms', privacy: '/privacy', cookies: '/cookies', refunds: '/refunds', about: '/about', accessibility: '/accessibility', copyright: '/copyright' };
export const consentCopy = {
  registration: 'I agree to the Terms of Use and acknowledge the Privacy Notice.',
  listing: 'I confirm this listing is accurate, I have the right to sell it and use its images, and I agree to the marketplace rules.',
};
export const websiteOperator = { name: 'Chandler Noguera', email: 'noguera.chandler.espenilla@gmail.com', status: 'Independently operated website' };
export function createPolicyConsent(kind, accepted) {
  const agreed = accepted === true;
  return kind === 'listing'
    ? { terms: agreed, imageRights: agreed, version: policyVersion }
    : { terms: agreed, privacy: agreed, version: policyVersion };
}
export const fallbackPublicConfig = {
  policyVersion,
  projectStatus: 'local',
  publicLaunchEnabled: false,
  qcuAuthorized: false,
  operator: { name: websiteOperator.name, email: websiteOperator.email, address: '' },
  authProviders: { password: true, google: false },
  analytics: { enabled: false, retentionDays: 90 },
  retention: { messagesDays: 365, notificationsDays: 90, reportsDays: 365, logsDays: 365, privacyRequestsDays: 365, transactionsDays: 365, disputesDays: 365 },
};
