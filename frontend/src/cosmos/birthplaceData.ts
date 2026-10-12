export interface BirthCity {
  id: string
  name: string
  chineseName: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
  timeZone: string
  geonamesId: number
  priority: number
}

export interface TimeZoneOption {
  id: string
  name: string
  region: string
  keywords: string
}

export const BIRTH_CITIES: BirthCity[] = [
  { id: 'kuala-lumpur', name: 'Kuala Lumpur', chineseName: '吉隆坡', country: 'Malaysia', countryCode: 'MY', latitude: 3.1412, longitude: 101.68653, timeZone: 'Asia/Kuala_Lumpur', geonamesId: 1735161, priority: 1 },
  { id: 'george-town', name: 'George Town', chineseName: '乔治市', country: 'Malaysia', countryCode: 'MY', latitude: 5.41123, longitude: 100.33543, timeZone: 'Asia/Kuala_Lumpur', geonamesId: 1735106, priority: 2 },
  { id: 'johor-bahru', name: 'Johor Bahru', chineseName: '新山', country: 'Malaysia', countryCode: 'MY', latitude: 1.4655, longitude: 103.7578, timeZone: 'Asia/Kuala_Lumpur', geonamesId: 1732752, priority: 3 },
  { id: 'kota-kinabalu', name: 'Kota Kinabalu', chineseName: '亚庇', country: 'Malaysia', countryCode: 'MY', latitude: 5.9749, longitude: 116.0724, timeZone: 'Asia/Kuching', geonamesId: 1733432, priority: 4 },
  { id: 'kuching', name: 'Kuching', chineseName: '古晋', country: 'Malaysia', countryCode: 'MY', latitude: 1.55, longitude: 110.33333, timeZone: 'Asia/Kuching', geonamesId: 1735634, priority: 5 },
  { id: 'ipoh', name: 'Ipoh', chineseName: '怡保', country: 'Malaysia', countryCode: 'MY', latitude: 4.5841, longitude: 101.0829, timeZone: 'Asia/Kuala_Lumpur', geonamesId: 1734634, priority: 6 },
  { id: 'malacca', name: 'Malacca', chineseName: '马六甲', country: 'Malaysia', countryCode: 'MY', latitude: 2.196, longitude: 102.2405, timeZone: 'Asia/Kuala_Lumpur', geonamesId: 1734759, priority: 7 },
  { id: 'shah-alam', name: 'Shah Alam', chineseName: '莎阿南', country: 'Malaysia', countryCode: 'MY', latitude: 3.08507, longitude: 101.53281, timeZone: 'Asia/Kuala_Lumpur', geonamesId: 1732903, priority: 8 },
  { id: 'petaling-jaya', name: 'Petaling Jaya', chineseName: '八打灵再也', country: 'Malaysia', countryCode: 'MY', latitude: 3.10726, longitude: 101.60671, timeZone: 'Asia/Kuala_Lumpur', geonamesId: 1735158, priority: 9 },
  { id: 'kuantan', name: 'Kuantan', chineseName: '关丹', country: 'Malaysia', countryCode: 'MY', latitude: 3.8077, longitude: 103.326, timeZone: 'Asia/Kuala_Lumpur', geonamesId: 1735227, priority: 10 },
  { id: 'putrajaya', name: 'Putrajaya', chineseName: '布城', country: 'Malaysia', countryCode: 'MY', latitude: 2.93527, longitude: 101.69112, timeZone: 'Asia/Kuala_Lumpur', geonamesId: 6697380, priority: 11 },
  { id: 'alor-setar', name: 'Alor Setar', chineseName: '亚罗士打', country: 'Malaysia', countryCode: 'MY', latitude: 6.12104, longitude: 100.36014, timeZone: 'Asia/Kuala_Lumpur', geonamesId: 1736309, priority: 12 },
  { id: 'singapore', name: 'Singapore', chineseName: '新加坡', country: 'Singapore', countryCode: 'SG', latitude: 1.28967, longitude: 103.85007, timeZone: 'Asia/Singapore', geonamesId: 1880252, priority: 20 },
  { id: 'bangkok', name: 'Bangkok', chineseName: '曼谷', country: 'Thailand', countryCode: 'TH', latitude: 13.75398, longitude: 100.50144, timeZone: 'Asia/Bangkok', geonamesId: 1609350, priority: 21 },
  { id: 'jakarta', name: 'Jakarta', chineseName: '雅加达', country: 'Indonesia', countryCode: 'ID', latitude: -6.21462, longitude: 106.84513, timeZone: 'Asia/Jakarta', geonamesId: 1642911, priority: 22 },
  { id: 'manila', name: 'Manila', chineseName: '马尼拉', country: 'Philippines', countryCode: 'PH', latitude: 14.6042, longitude: 120.9822, timeZone: 'Asia/Manila', geonamesId: 1701668, priority: 23 },
  { id: 'hong-kong', name: 'Hong Kong', chineseName: '香港', country: 'Hong Kong', countryCode: 'HK', latitude: 22.27832, longitude: 114.17469, timeZone: 'Asia/Hong_Kong', geonamesId: 1819729, priority: 24 },
  { id: 'taipei', name: 'Taipei', chineseName: '台北', country: 'Taiwan', countryCode: 'TW', latitude: 25.05306, longitude: 121.52639, timeZone: 'Asia/Taipei', geonamesId: 1668341, priority: 25 },
  { id: 'tokyo', name: 'Tokyo', chineseName: '东京', country: 'Japan', countryCode: 'JP', latitude: 35.6895, longitude: 139.69171, timeZone: 'Asia/Tokyo', geonamesId: 1850147, priority: 26 },
  { id: 'seoul', name: 'Seoul', chineseName: '首尔', country: 'South Korea', countryCode: 'KR', latitude: 37.566, longitude: 126.9784, timeZone: 'Asia/Seoul', geonamesId: 1835848, priority: 27 },
  { id: 'beijing', name: 'Beijing', chineseName: '北京', country: 'China', countryCode: 'CN', latitude: 39.9075, longitude: 116.39723, timeZone: 'Asia/Shanghai', geonamesId: 1816670, priority: 28 },
  { id: 'shanghai', name: 'Shanghai', chineseName: '上海', country: 'China', countryCode: 'CN', latitude: 31.22222, longitude: 121.45806, timeZone: 'Asia/Shanghai', geonamesId: 1796236, priority: 29 },
  { id: 'delhi', name: 'Delhi', chineseName: '德里', country: 'India', countryCode: 'IN', latitude: 28.65195, longitude: 77.23149, timeZone: 'Asia/Kolkata', geonamesId: 1273294, priority: 30 },
  { id: 'dubai', name: 'Dubai', chineseName: '迪拜', country: 'United Arab Emirates', countryCode: 'AE', latitude: 25.07725, longitude: 55.30927, timeZone: 'Asia/Dubai', geonamesId: 292223, priority: 31 },
  { id: 'london', name: 'London', chineseName: '伦敦', country: 'United Kingdom', countryCode: 'GB', latitude: 51.50853, longitude: -0.12574, timeZone: 'Europe/London', geonamesId: 2643743, priority: 32 },
  { id: 'paris', name: 'Paris', chineseName: '巴黎', country: 'France', countryCode: 'FR', latitude: 48.85341, longitude: 2.3488, timeZone: 'Europe/Paris', geonamesId: 2988507, priority: 33 },
  { id: 'berlin', name: 'Berlin', chineseName: '柏林', country: 'Germany', countryCode: 'DE', latitude: 52.52437, longitude: 13.41053, timeZone: 'Europe/Berlin', geonamesId: 2950159, priority: 34 },
  { id: 'new-york', name: 'New York City', chineseName: '纽约', country: 'United States', countryCode: 'US', latitude: 40.71427, longitude: -74.00597, timeZone: 'America/New_York', geonamesId: 5128581, priority: 35 },
  { id: 'los-angeles', name: 'Los Angeles', chineseName: '洛杉矶', country: 'United States', countryCode: 'US', latitude: 34.05223, longitude: -118.24368, timeZone: 'America/Los_Angeles', geonamesId: 5368361, priority: 36 },
  { id: 'chicago', name: 'Chicago', chineseName: '芝加哥', country: 'United States', countryCode: 'US', latitude: 41.85003, longitude: -87.65005, timeZone: 'America/Chicago', geonamesId: 4887398, priority: 37 },
  { id: 'toronto', name: 'Toronto', chineseName: '多伦多', country: 'Canada', countryCode: 'CA', latitude: 43.70643, longitude: -79.39864, timeZone: 'America/Toronto', geonamesId: 6167865, priority: 38 },
  { id: 'vancouver', name: 'Vancouver', chineseName: '温哥华', country: 'Canada', countryCode: 'CA', latitude: 49.24966, longitude: -123.11934, timeZone: 'America/Vancouver', geonamesId: 6173331, priority: 39 },
  { id: 'sydney', name: 'Sydney', chineseName: '悉尼', country: 'Australia', countryCode: 'AU', latitude: -33.86785, longitude: 151.20732, timeZone: 'Australia/Sydney', geonamesId: 2147714, priority: 40 },
  { id: 'melbourne', name: 'Melbourne', chineseName: '墨尔本', country: 'Australia', countryCode: 'AU', latitude: -37.814, longitude: 144.96332, timeZone: 'Australia/Melbourne', geonamesId: 2158177, priority: 41 },
  { id: 'auckland', name: 'Auckland', chineseName: '奥克兰', country: 'New Zealand', countryCode: 'NZ', latitude: -36.84853, longitude: 174.76349, timeZone: 'Pacific/Auckland', geonamesId: 2193733, priority: 42 },
  { id: 'honolulu', name: 'Honolulu', chineseName: '檀香山', country: 'United States', countryCode: 'US', latitude: 21.30694, longitude: -157.85833, timeZone: 'Pacific/Honolulu', geonamesId: 5856195, priority: 43 },
  { id: 'sao-paulo', name: 'São Paulo', chineseName: '圣保罗', country: 'Brazil', countryCode: 'BR', latitude: -23.5475, longitude: -46.63611, timeZone: 'America/Sao_Paulo', geonamesId: 3448439, priority: 44 },
  { id: 'mexico-city', name: 'Mexico City', chineseName: '墨西哥城', country: 'Mexico', countryCode: 'MX', latitude: 19.42847, longitude: -99.12766, timeZone: 'America/Mexico_City', geonamesId: 3530597, priority: 45 },
  { id: 'johannesburg', name: 'Johannesburg', chineseName: '约翰内斯堡', country: 'South Africa', countryCode: 'ZA', latitude: -26.20227, longitude: 28.04363, timeZone: 'Africa/Johannesburg', geonamesId: 993800, priority: 46 },
  { id: 'cairo', name: 'Cairo', chineseName: '开罗', country: 'Egypt', countryCode: 'EG', latitude: 30.06263, longitude: 31.24967, timeZone: 'Africa/Cairo', geonamesId: 360630, priority: 47 },
]

export const TIME_ZONE_OPTIONS: TimeZoneOption[] = [
  { id: 'Asia/Kuala_Lumpur', name: 'Malaysia Time', region: 'Malaysia (Peninsular)', keywords: 'malaysia kuala lumpur penang johor ipoh malacca' },
  { id: 'Asia/Kuching', name: 'East Malaysia Time', region: 'Sabah & Sarawak', keywords: 'malaysia kuching kota kinabalu sabah sarawak' },
  { id: 'Asia/Singapore', name: 'Singapore Time', region: 'Singapore', keywords: 'singapore' },
  { id: 'Asia/Bangkok', name: 'Indochina Time', region: 'Thailand', keywords: 'bangkok thailand' },
  { id: 'Asia/Jakarta', name: 'Western Indonesia Time', region: 'Jakarta, Indonesia', keywords: 'jakarta indonesia' },
  { id: 'Asia/Manila', name: 'Philippine Time', region: 'Philippines', keywords: 'manila philippines' },
  { id: 'Asia/Hong_Kong', name: 'Hong Kong Time', region: 'Hong Kong', keywords: 'hong kong' },
  { id: 'Asia/Taipei', name: 'Taipei Time', region: 'Taiwan', keywords: 'taipei taiwan' },
  { id: 'Asia/Tokyo', name: 'Japan Time', region: 'Japan', keywords: 'tokyo japan' },
  { id: 'Asia/Seoul', name: 'Korea Time', region: 'South Korea', keywords: 'seoul korea' },
  { id: 'Asia/Shanghai', name: 'China Standard Time', region: 'China', keywords: 'beijing shanghai china' },
  { id: 'Asia/Kolkata', name: 'India Standard Time', region: 'India', keywords: 'delhi india kolkata' },
  { id: 'Asia/Dubai', name: 'Gulf Standard Time', region: 'United Arab Emirates', keywords: 'dubai uae emirates' },
  { id: 'Europe/London', name: 'United Kingdom Time', region: 'United Kingdom', keywords: 'london britain uk england' },
  { id: 'Europe/Paris', name: 'Central European Time', region: 'France', keywords: 'paris france' },
  { id: 'Europe/Berlin', name: 'Central European Time', region: 'Germany', keywords: 'berlin germany' },
  { id: 'America/New_York', name: 'Eastern Time', region: 'New York, United States', keywords: 'new york eastern usa' },
  { id: 'America/Chicago', name: 'Central Time', region: 'Chicago, United States', keywords: 'chicago central usa' },
  { id: 'America/Los_Angeles', name: 'Pacific Time', region: 'Los Angeles, United States', keywords: 'los angeles pacific usa' },
  { id: 'America/Toronto', name: 'Eastern Time', region: 'Toronto, Canada', keywords: 'toronto canada eastern' },
  { id: 'America/Vancouver', name: 'Pacific Time', region: 'Vancouver, Canada', keywords: 'vancouver canada pacific' },
  { id: 'America/Mexico_City', name: 'Central Mexico Time', region: 'Mexico', keywords: 'mexico city' },
  { id: 'America/Sao_Paulo', name: 'Brasília Time', region: 'Brazil', keywords: 'sao paulo brazil brasilia' },
  { id: 'Australia/Sydney', name: 'Sydney Time', region: 'New South Wales, Australia', keywords: 'sydney australia' },
  { id: 'Australia/Melbourne', name: 'Melbourne Time', region: 'Victoria, Australia', keywords: 'melbourne australia' },
  { id: 'Pacific/Auckland', name: 'New Zealand Time', region: 'New Zealand', keywords: 'auckland new zealand' },
  { id: 'Pacific/Honolulu', name: 'Hawaii Time', region: 'Hawaii, United States', keywords: 'honolulu hawaii' },
  { id: 'Africa/Johannesburg', name: 'South Africa Time', region: 'South Africa', keywords: 'johannesburg south africa' },
  { id: 'Africa/Cairo', name: 'Egypt Time', region: 'Egypt', keywords: 'cairo egypt' },
  { id: 'UTC', name: 'Coordinated Universal Time', region: 'UTC', keywords: 'utc universal greenwich' },
]

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
}

export function cityLabel(city: BirthCity): string {
  return `${city.chineseName} · ${city.name}, ${city.country}`
}

export function searchBirthCities(query: string, limit = 8): BirthCity[] {
  const needle = normalized(query)
  return [...BIRTH_CITIES]
    .filter((city) => !needle || normalized(`${city.name} ${city.chineseName} ${city.country} ${city.countryCode}`).includes(needle))
    .sort((left, right) => left.priority - right.priority)
    .slice(0, limit)
}

export function timeZoneOption(id: string): TimeZoneOption | undefined {
  return TIME_ZONE_OPTIONS.find((option) => option.id === id)
}

export function searchTimeZones(query: string, limit = 8): TimeZoneOption[] {
  const needle = normalized(query)
  return TIME_ZONE_OPTIONS
    .filter((option) => !needle || normalized(`${option.name} ${option.region} ${option.id} ${option.keywords}`).includes(needle))
    .slice(0, limit)
}
