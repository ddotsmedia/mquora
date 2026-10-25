// Common Manglish (Malayalam written in Latin letters) words and their Malayalam script forms.
// Used to widen search so "veedu loan" also finds posts written in Malayalam script.
// Keep this list small and reviewed by a Malayalam speaker; add entries rather than rules.
const MANGLISH_TO_MALAYALAM: Record<string, string> = {
  veedu: 'വീട്',
  veed: 'വീട്',
  loan: 'ലോൺ',
  panam: 'പണം',
  joli: 'ജോലി',
  job: 'ജോലി',
  vidyabhyasam: 'വിദ്യാഭ്യാസം',
  aarogyam: 'ആരോഗ്യം',
  rogam: 'രോഗം',
  marunnu: 'മരുന്ന്',
  vellam: 'വെള്ളം',
  school: 'സ്കൂൾ',
  aashupathri: 'ആശുപത്രി',
  hospital: 'ആശുപത്രി',
  visa: 'വിസ',
  gulf: 'ഗൾഫ്',
  jeevitham: 'ജീവിതം',
  sneham: 'സ്നേഹം',
  kudumbam: 'കുടുംബം',
  krishi: 'കൃഷി',
  mazha: 'മഴ',
  business: 'ബിസിനസ്',
  ayurveda: 'ആയുർവേദം',
  ayurvedam: 'ആയുർവേദം',
  bhakshanam: 'ഭക്ഷണം',
  amma: 'അമ്മ',
  achan: 'അച്ഛൻ',
  kuttikal: 'കുട്ടികൾ',
};

/** Returns the original query plus Malayalam-script forms of any known Manglish words in it. */
export function expandQuery(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z]/g, '')).filter(Boolean);
  const expansions = words.map((w) => MANGLISH_TO_MALAYALAM[w]).filter((v): v is string => Boolean(v));
  return Array.from(new Set([query, ...expansions]));
}
