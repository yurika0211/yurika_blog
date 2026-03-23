type DateInput = string | number | Date | null | undefined;

const pad2 = (value: number) => String(value).padStart(2, '0');

export const formatDate = (input: DateInput): string => {
  if (input == null || input === '') {
    return '';
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    const dateLikeMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(trimmed);
    if (dateLikeMatch) {
      const [, year, month, day] = dateLikeMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return String(input);
  }

  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
};
