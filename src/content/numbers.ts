/** Numbers in English and Nepali. Nepali number words are irregular, so they are listed, never generated. */
export const EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export const NE_NUM = ['शून्य', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ', 'दश'];
/** Counting objects uses the classifier -वटा, and "one" becomes एउटा. */
export const NE_COUNTED = ['', 'एउटा', 'दुईवटा', 'तीनवटा', 'चारवटा', 'पाँचवटा', 'छवटा', 'सातवटा', 'आठवटा', 'नौवटा', 'दशवटा'];

const NE_DIGITS = '०१२३४५६७८९';
export function neDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => NE_DIGITS[Number(d)]);
}
