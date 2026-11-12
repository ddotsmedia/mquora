// Malayalam Unicode block is U+0D00–U+0D7F. Communities and topics have no language field,
// so a page is marked Malayalam when its visible text contains Malayalam script.
const MALAYALAM_SCRIPT = /[ഀ-ൿ]/;

export function pageLang(...texts: Array<string | null | undefined>): 'ml' | 'en' {
  return texts.some((t) => t && MALAYALAM_SCRIPT.test(t)) ? 'ml' : 'en';
}
