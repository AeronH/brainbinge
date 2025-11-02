import { Inngest } from 'inngest';

// Initialize Inngest client
// For local dev, app ID can be optional
// For production, set INNGEST_APP_ID and INNGEST_SIGNING_KEY in env
export const inngest = new Inngest({
  id: process.env.INNGEST_APP_ID || 'brainbinge-local',
  // Signing key is optional for local dev but required for production
  signingKey: process.env.INNGEST_SIGNING_KEY,
});



