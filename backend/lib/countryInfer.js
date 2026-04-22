// Infer ISO-2 country code from a range/operator name like
// "Afghanistan Etisalat TF01" → "AF", "Lebanon Alfa FB01" → "LB"
// Used by both the TG bot and the admin tgbot routes so that
// allocations missing a real country_code still group correctly.

const NAME_TO_CC = {
  afghanistan: 'AF', albania: 'AL', algeria: 'DZ', argentina: 'AR', armenia: 'AM',
  australia: 'AU', austria: 'AT', azerbaijan: 'AZ', bahrain: 'BH', bangladesh: 'BD',
  belarus: 'BY', belgium: 'BE', benin: 'BJ', bolivia: 'BO', brazil: 'BR',
  bulgaria: 'BG', burkina: 'BF', cambodia: 'KH', cameroon: 'CM', canada: 'CA',
  chad: 'TD', chile: 'CL', china: 'CN', colombia: 'CO', congo: 'CG',
  croatia: 'HR', cyprus: 'CY', czech: 'CZ', denmark: 'DK', djibouti: 'DJ',
  ecuador: 'EC', egypt: 'EG', estonia: 'EE', ethiopia: 'ET', finland: 'FI',
  france: 'FR', gabon: 'GA', gambia: 'GM', georgia: 'GE', germany: 'DE',
  ghana: 'GH', greece: 'GR', guatemala: 'GT', guinea: 'GN', honduras: 'HN',
  hongkong: 'HK', 'hong kong': 'HK', hungary: 'HU', india: 'IN', indonesia: 'ID',
  iran: 'IR', iraq: 'IQ', ireland: 'IE', israel: 'IL', italy: 'IT',
  ivory: 'CI', "côte d'ivoire": 'CI', jamaica: 'JM', japan: 'JP', jordan: 'JO',
  kazakhstan: 'KZ', kenya: 'KE', kuwait: 'KW', kyrgyzstan: 'KG', laos: 'LA',
  latvia: 'LV', lebanon: 'LB', liberia: 'LR', libya: 'LY', lithuania: 'LT',
  luxembourg: 'LU', macau: 'MO', madagascar: 'MG', malawi: 'MW', malaysia: 'MY',
  maldives: 'MV', mali: 'ML', mauritania: 'MR', mauritius: 'MU', mexico: 'MX',
  moldova: 'MD', mongolia: 'MN', morocco: 'MA', mozambique: 'MZ', myanmar: 'MM',
  namibia: 'NA', nepal: 'NP', netherlands: 'NL', niger: 'NE', nigeria: 'NG',
  norway: 'NO', oman: 'OM', pakistan: 'PK', palestine: 'PS', panama: 'PA',
  paraguay: 'PY', peru: 'PE', philippines: 'PH', poland: 'PL', portugal: 'PT',
  qatar: 'QA', romania: 'RO', russia: 'RU', rwanda: 'RW',
  'saudi arabia': 'SA', saudi: 'SA', senegal: 'SN', serbia: 'RS',
  sierra: 'SL', singapore: 'SG', slovakia: 'SK', slovenia: 'SI',
  somalia: 'SO', 'south africa': 'ZA', 'south korea': 'KR', korea: 'KR',
  spain: 'ES', srilanka: 'LK', 'sri lanka': 'LK', sudan: 'SD', sweden: 'SE',
  switzerland: 'CH', syria: 'SY', taiwan: 'TW', tajikistan: 'TJ', tanzania: 'TZ',
  thailand: 'TH', togo: 'TG', tunisia: 'TN', turkey: 'TR', turkmenistan: 'TM',
  'timor-leste': 'TL', 'timor leste': 'TL', 'east timor': 'TL', timor: 'TL',
  uae: 'AE', 'united arab': 'AE', emirates: 'AE',
  uganda: 'UG', uk: 'GB', 'united kingdom': 'GB', britain: 'GB',
  ukraine: 'UA', uruguay: 'UY', usa: 'US', 'united states': 'US', america: 'US',
  uzbekistan: 'UZ', venezuela: 'VE', vietnam: 'VN', yemen: 'YE',
  zambia: 'ZM', zimbabwe: 'ZW',
};

const COUNTRY_NAMES = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AR: 'Argentina', AM: 'Armenia',
  AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh',
  BY: 'Belarus', BE: 'Belgium', BJ: 'Benin', BO: 'Bolivia', BR: 'Brazil',
  BG: 'Bulgaria', BF: 'Burkina Faso', KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada',
  TD: 'Chad', CL: 'Chile', CN: 'China', CO: 'Colombia', CG: 'Congo',
  HR: 'Croatia', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark', DJ: 'Djibouti',
  EC: 'Ecuador', EG: 'Egypt', EE: 'Estonia', ET: 'Ethiopia', FI: 'Finland',
  FR: 'France', GA: 'Gabon', GM: 'Gambia', GE: 'Georgia', DE: 'Germany',
  GH: 'Ghana', GR: 'Greece', GT: 'Guatemala', GN: 'Guinea', HN: 'Honduras',
  HK: 'Hong Kong', HU: 'Hungary', IN: 'India', ID: 'Indonesia', IR: 'Iran',
  IQ: 'Iraq', IE: 'Ireland', IL: 'Israel', IT: 'Italy', CI: "Côte d'Ivoire",
  JM: 'Jamaica', JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KE: 'Kenya',
  KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LV: 'Latvia', LB: 'Lebanon',
  LR: 'Liberia', LY: 'Libya', LT: 'Lithuania', LU: 'Luxembourg', MO: 'Macau',
  MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia', MV: 'Maldives', ML: 'Mali',
  MR: 'Mauritania', MU: 'Mauritius', MX: 'Mexico', MD: 'Moldova', MN: 'Mongolia',
  MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar', NA: 'Namibia', NP: 'Nepal',
  NL: 'Netherlands', NE: 'Niger', NG: 'Nigeria', NO: 'Norway', OM: 'Oman',
  PK: 'Pakistan', PS: 'Palestine', PA: 'Panama', PY: 'Paraguay', PE: 'Peru',
  PH: 'Philippines', PL: 'Poland', PT: 'Portugal', QA: 'Qatar', RO: 'Romania',
  RU: 'Russia', RW: 'Rwanda', SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia',
  SL: 'Sierra Leone', SG: 'Singapore', SK: 'Slovakia', SI: 'Slovenia',
  SO: 'Somalia', ZA: 'South Africa', KR: 'South Korea', ES: 'Spain',
  LK: 'Sri Lanka', SD: 'Sudan', SE: 'Sweden', CH: 'Switzerland', SY: 'Syria',
  TW: 'Taiwan', TJ: 'Tajikistan', TZ: 'Tanzania', TH: 'Thailand', TG: 'Togo',
  TN: 'Tunisia', TR: 'Turkey', TM: 'Turkmenistan', AE: 'UAE', UG: 'Uganda',
  TL: 'Timor-Leste',
  GB: 'United Kingdom', UA: 'Ukraine', UY: 'Uruguay', US: 'United States',
  UZ: 'Uzbekistan', VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen',
  ZM: 'Zambia', ZW: 'Zimbabwe',
};

function inferCountryCode(rangeName) {
  if (!rangeName) return null;
  const lower = String(rangeName).toLowerCase();
  // Try multi-word matches first
  for (const [name, cc] of Object.entries(NAME_TO_CC)) {
    if (name.includes(' ') && lower.includes(name)) return cc;
  }
  // Then single-word
  for (const [name, cc] of Object.entries(NAME_TO_CC)) {
    if (!name.includes(' ') && lower.includes(name)) return cc;
  }
  return null;
}

// Best-effort country code: prefer real DB column, else infer from name
function bestCountryCode(realCc, rangeName) {
  if (realCc && String(realCc).trim().length === 2) return String(realCc).toUpperCase();
  return inferCountryCode(rangeName);
}

function countryName(cc) {
  return COUNTRY_NAMES[cc] || cc || 'Unknown';
}

function flagOf(cc) {
  if (!cc || cc.length !== 2) return '🌐';
  const A = 0x1F1E6;
  const a = 'A'.charCodeAt(0);
  return (
    String.fromCodePoint(A + (cc.charCodeAt(0) - a)) +
    String.fromCodePoint(A + (cc.charCodeAt(1) - a))
  );
}

module.exports = { inferCountryCode, bestCountryCode, countryName, flagOf, COUNTRY_NAMES };
