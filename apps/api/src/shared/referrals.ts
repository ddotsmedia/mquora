import { customAlphabet } from 'nanoid';

// Each referred account that is approved gives its referrer this much reputation, up to REFERRAL_CAP accounts.
export const REFERRAL_REPUTATION = 10;
export const REFERRAL_CAP = 20;

const makeCode = customAlphabet('abcdefghjkmnpqrstuvwxyz23456789', 8);
export const newReferralCode = () => makeCode();
