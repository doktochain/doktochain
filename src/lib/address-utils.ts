const PROVINCE_NAME_TO_CODE: Record<string, string> = {
  'ontario': 'ON',
  'british columbia': 'BC',
  'alberta': 'AB',
  'quebec': 'QC',
  'québec': 'QC',
  'manitoba': 'MB',
  'saskatchewan': 'SK',
  'nova scotia': 'NS',
  'new brunswick': 'NB',
  'newfoundland and labrador': 'NL',
  'newfoundland': 'NL',
  'prince edward island': 'PE',
  'northwest territories': 'NT',
  'nunavut': 'NU',
  'yukon': 'YT',
};

const US_STATE_TO_CODE: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY',
};

export function provinceNameToCode(name: string | undefined | null): string | null {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  if (PROVINCE_NAME_TO_CODE[normalized]) return PROVINCE_NAME_TO_CODE[normalized];
  if (US_STATE_TO_CODE[normalized]) return US_STATE_TO_CODE[normalized];
  if (/^[A-Z]{2}$/i.test(name.trim())) return name.trim().toUpperCase();
  return null;
}

export function countryNameToCode(name: string | undefined | null): string {
  if (!name) return 'CA';
  const normalized = name.trim().toLowerCase();
  if (normalized === 'canada') return 'CA';
  if (normalized === 'united states' || normalized === 'united states of america' || normalized === 'usa') return 'US';
  return name.toUpperCase().slice(0, 2);
}
