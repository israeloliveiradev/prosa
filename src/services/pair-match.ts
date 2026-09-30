export function pairFits(
  author: { native_lang: string; target_lang: string },
  reviewer: { native_lang: string; target_lang: string },
): boolean {
  if (author.target_lang === reviewer.target_lang && author.native_lang === reviewer.native_lang) {
    return false;
  }
  if (reviewer.native_lang !== author.target_lang) {
    return false;
  }
  if (reviewer.target_lang === author.native_lang) {
    return true;
  }
  return author.native_lang === "pt";
}
