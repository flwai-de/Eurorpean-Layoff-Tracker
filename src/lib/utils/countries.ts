interface CountryInfo {
  nameEn: string;
  nameDe: string;
  flag: string;
}

export const regionCodes = new Set(["EU", "WW"]);

export const europeanCountries = new Map<string, CountryInfo>([
  ["EU", { nameEn: "Europe", nameDe: "Europa", flag: "\u{1F1EA}\u{1F1FA}" }],
  ["WW", { nameEn: "Worldwide", nameDe: "Weltweit", flag: "\u{1F30D}" }],
  ["DE", { nameEn: "Germany", nameDe: "Deutschland", flag: "\u{1F1E9}\u{1F1EA}" }],
  ["AT", { nameEn: "Austria", nameDe: "\u00D6sterreich", flag: "\u{1F1E6}\u{1F1F9}" }],
  ["CH", { nameEn: "Switzerland", nameDe: "Schweiz", flag: "\u{1F1E8}\u{1F1ED}" }],
  ["GB", { nameEn: "United Kingdom", nameDe: "Vereinigtes K\u00F6nigreich", flag: "\u{1F1EC}\u{1F1E7}" }],
  ["FR", { nameEn: "France", nameDe: "Frankreich", flag: "\u{1F1EB}\u{1F1F7}" }],
  ["NL", { nameEn: "Netherlands", nameDe: "Niederlande", flag: "\u{1F1F3}\u{1F1F1}" }],
  ["SE", { nameEn: "Sweden", nameDe: "Schweden", flag: "\u{1F1F8}\u{1F1EA}" }],
  ["NO", { nameEn: "Norway", nameDe: "Norwegen", flag: "\u{1F1F3}\u{1F1F4}" }],
  ["DK", { nameEn: "Denmark", nameDe: "D\u00E4nemark", flag: "\u{1F1E9}\u{1F1F0}" }],
  ["FI", { nameEn: "Finland", nameDe: "Finnland", flag: "\u{1F1EB}\u{1F1EE}" }],
  ["IE", { nameEn: "Ireland", nameDe: "Irland", flag: "\u{1F1EE}\u{1F1EA}" }],
  ["ES", { nameEn: "Spain", nameDe: "Spanien", flag: "\u{1F1EA}\u{1F1F8}" }],
  ["IT", { nameEn: "Italy", nameDe: "Italien", flag: "\u{1F1EE}\u{1F1F9}" }],
  ["PT", { nameEn: "Portugal", nameDe: "Portugal", flag: "\u{1F1F5}\u{1F1F9}" }],
  ["PL", { nameEn: "Poland", nameDe: "Polen", flag: "\u{1F1F5}\u{1F1F1}" }],
  ["CZ", { nameEn: "Czech Republic", nameDe: "Tschechien", flag: "\u{1F1E8}\u{1F1FF}" }],
  ["RO", { nameEn: "Romania", nameDe: "Rum\u00E4nien", flag: "\u{1F1F7}\u{1F1F4}" }],
  ["BE", { nameEn: "Belgium", nameDe: "Belgien", flag: "\u{1F1E7}\u{1F1EA}" }],
  ["LU", { nameEn: "Luxembourg", nameDe: "Luxemburg", flag: "\u{1F1F1}\u{1F1FA}" }],
  ["EE", { nameEn: "Estonia", nameDe: "Estland", flag: "\u{1F1EA}\u{1F1EA}" }],
  ["LV", { nameEn: "Latvia", nameDe: "Lettland", flag: "\u{1F1F1}\u{1F1FB}" }],
  ["LT", { nameEn: "Lithuania", nameDe: "Litauen", flag: "\u{1F1F1}\u{1F1F9}" }],
  ["HU", { nameEn: "Hungary", nameDe: "Ungarn", flag: "\u{1F1ED}\u{1F1FA}" }],
  ["BG", { nameEn: "Bulgaria", nameDe: "Bulgarien", flag: "\u{1F1E7}\u{1F1EC}" }],
  ["HR", { nameEn: "Croatia", nameDe: "Kroatien", flag: "\u{1F1ED}\u{1F1F7}" }],
  ["SK", { nameEn: "Slovakia", nameDe: "Slowakei", flag: "\u{1F1F8}\u{1F1F0}" }],
  ["SI", { nameEn: "Slovenia", nameDe: "Slowenien", flag: "\u{1F1F8}\u{1F1EE}" }],
  ["GR", { nameEn: "Greece", nameDe: "Griechenland", flag: "\u{1F1EC}\u{1F1F7}" }],
]);

export function getCountryName(code: string, locale: "de" | "en"): string {
  const country = europeanCountries.get(code.toUpperCase());
  if (!country) return code;
  return locale === "de" ? country.nameDe : country.nameEn;
}

export function getCountryFlag(code: string): string {
  return europeanCountries.get(code.toUpperCase())?.flag ?? "";
}
