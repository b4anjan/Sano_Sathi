/** Numbers in English and Nepali. Nepali number words are irregular, so they are listed, never generated. */
export const EN_NUM = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];
export const NE_NUM = [
  'शून्य', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ', 'दश',
  'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस', 'बीस',
];
/** Counting objects uses the classifier -वटा, and "one" becomes एउटा. */
export const NE_COUNTED = ['', 'एउटा', 'दुईवटा', 'तीनवटा', 'चारवटा', 'पाँचवटा', 'छवटा', 'सातवटा', 'आठवटा', 'नौवटा', 'दशवटा'];

const NE_DIGITS = '०१२३४५६७८९';
export function neDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => NE_DIGITS[Number(d)]);
}
