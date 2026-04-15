import { NextResponse } from "next/server";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies, industries, layoffs } from "@/lib/db/schema";
import { generateSlug } from "@/lib/utils/slug";

interface LayoffInput {
  company: string;
  date: string;
  affected: number;
  percentage: string | null;
  country: string;
  countryHq: string;
  industry: string;
  source: string;
}

const INDUSTRIES_TO_UPSERT = [
  { slug: "gaming", nameEn: "Gaming", nameDe: "Gaming", parentSlug: "technology" },
  { slug: "ecommerce", nameEn: "E-Commerce", nameDe: "E-Commerce", parentSlug: "technology" },
  { slug: "fintech", nameEn: "FinTech", nameDe: "FinTech", parentSlug: "technology" },
  { slug: "travel", nameEn: "Travel & Hospitality", nameDe: "Reise & Gastgewerbe", parentSlug: null },
  { slug: "education", nameEn: "Education", nameDe: "Bildung", parentSlug: null },
];

const LAYOFFS: LayoffInput[] = [
  // Q3 2023
  { company: "Marshalls", date: "2023-07-31", affected: 250, percentage: null, country: "GB", countryHq: "GB", industry: "manufacturing", source: "https://www.constructionenquirer.com/2023/07/31/marshalls-to-cut-250-jobs-as-sales-slump/" },
  { company: "Virgin Media O2", date: "2023-07-24", affected: 2000, percentage: null, country: "GB", countryHq: "GB", industry: "telecom", source: "https://finance.yahoo.com/news/corrected-update-2-uks-virgin-095250078.html" },
  { company: "Air Liquide", date: "2023-07-05", affected: 430, percentage: null, country: "FR", countryHq: "FR", industry: "healthcare", source: "https://uk.investing.com/news/stock-market-news/air-liquide-might-reduce-over-400-net-positions-in-france-3073718" },
  { company: "ProSiebenSat.1", date: "2023-07-18", affected: 400, percentage: "10.00", country: "DE", countryHq: "DE", industry: "media", source: "https://uk.finance.yahoo.com/news/prosiebensat-1-cut-400-jobs-095250078.html" },
  { company: "UBS", date: "2023-08-30", affected: 3000, percentage: null, country: "CH", countryHq: "CH", industry: "finance", source: "https://www.reuters.com/markets/europe/ubs-targets-10-billion-costs-cut-3000-jobs-after-credit-suisse-takeover-2023-08-30/" },
  { company: "UPM Plattling", date: "2023-07-24", affected: 401, percentage: null, country: "DE", countryHq: "FI", industry: "manufacturing", source: "https://www.upm.com/news-and-stories/releases/2023/07/upm-plans-closure-of-its-plattling-mill-in-germany/" },
  { company: "Fiskars Group", date: "2023-09-13", affected: 400, percentage: null, country: "WW", countryHq: "FI", industry: "retail", source: "https://fiskarsgroup.com/wp-content/uploads/2024/03/FiskarsGroup_Financial_Statements_2023.pdf" },
  { company: "Wilko", date: "2023-09-05", affected: 1315, percentage: null, country: "GB", countryHq: "GB", industry: "retail", source: "https://www.reuters.com/business/retail-consumer/wilko-administrators-confirm-1300-job-cuts-collapsed-uk-retailer-2023-09-05/" },
  { company: "dormakaba", date: "2023-07-03", affected: 800, percentage: null, country: "WW", countryHq: "CH", industry: "manufacturing", source: "https://report.dormakaba.com/2022_23/app/uploads/Annual-Report-2022--2023-en.pdf" },
  { company: "Stora Enso", date: "2023-09-04", affected: 710, percentage: null, country: "EU", countryHq: "FI", industry: "manufacturing", source: "https://www.packaging-gateway.com/news/stora-enso-restructuring-update/" },
  { company: "Viaplay Group", date: "2023-07-20", affected: 450, percentage: "25.00", country: "WW", countryHq: "SE", industry: "media", source: "https://www.broadbandtvnews.com/2023/07/20/viaplay-to-shed-over-25-of-workforce-and-exit-markets/" },

  // Südeuropa
  { company: "Telefonica Espana", date: "2024-01-03", affected: 3421, percentage: "16.00", country: "ES", countryHq: "ES", industry: "telecom", source: "https://www.reuters.com/business/media-telecom/telefonica-spend-13-bln-euros-layoff-plan-spain-2024-01-03/" },
  { company: "Bridgestone Hispania", date: "2025-04-02", affected: 546, percentage: "20.00", country: "ES", countryHq: "JP", industry: "automotive", source: "https://www.reuters.com/sustainability/sustainable-finance-reporting/tyre-maker-bridgestone-cut-546-jobs-spain-uncertainty-2025-04-02/" },
  { company: "Alcampo", date: "2025-05-08", affected: 710, percentage: "3.00", country: "ES", countryHq: "FR", industry: "retail", source: "https://www.reuters.com/world/europe/french-supermarket-group-auchan-cut-over-700-jobs-spain-2025-05-08/" },
  { company: "MasOrange", date: "2024-09-03", affected: 795, percentage: "10.00", country: "ES", countryHq: "FR", industry: "telecom", source: "https://www.reuters.com/business/media-telecom/spains-masorange-plans-cut-up-795-jobs-union-ugt-says-2024-09-03/" },
  { company: "H&M Spain", date: "2024-09-16", affected: 521, percentage: null, country: "ES", countryHq: "SE", industry: "retail", source: "https://ecommerce-news.es/hm-inicia-el-ere-en-espana-y-anuncia-el-cierre-de-casi-30-tiendas/" },
  { company: "Bimbo", date: "2024-09-18", affected: 166, percentage: null, country: "ES", countryHq: "MX", industry: "manufacturing", source: "https://www.rtve.es/noticias/20240919/bimbo-anuncia-cierre-planta-valladolid-afectara-166-trabajadores/16255431.shtml" },
  { company: "Cartonajes Internacionales", date: "2026-02-03", affected: 200, percentage: null, country: "ES", countryHq: "US", industry: "manufacturing", source: "https://www.lavanguardia.com/dinero/20260204/11457547/cartonajes-internacionales-despedira-200-trabajadores-valls-montblanc.html" },
  { company: "UniCredit", date: "2024-10-17", affected: 1000, percentage: null, country: "IT", countryHq: "IT", industry: "finance", source: "https://www.investing.com/news/economy-news/factboxeuropean-companies-cut-jobs-as-economy-sputters-3806413" },
  { company: "UBS Italien", date: "2025-04-01", affected: 180, percentage: null, country: "IT", countryHq: "CH", industry: "finance", source: "https://www.rte.ie/news/business/2025/0527/1515136-european-firms-cut-jobs-in-response-to-slowing-economy/" },
  { company: "Stellantis Melfi", date: "2025-05-07", affected: 500, percentage: "10.00", country: "IT", countryHq: "NL", industry: "automotive", source: "https://www.reuters.com/business/world-at-work/stellantis-cut-up-500-jobs-through-voluntary-exits-italys-melfi-plant-union-says-2025-05-07/" },
  { company: "Stellantis Termoli", date: "2025-05-08", affected: 200, percentage: "11.00", country: "IT", countryHq: "NL", industry: "automotive", source: "https://www.reuters.com/business/world-at-work/stellantis-cut-up-200-jobs-through-voluntary-exits-italys-termoli-plant-2025-05-08/" },
  { company: "Stellantis Mirafiori", date: "2025-06-09", affected: 610, percentage: null, country: "IT", countryHq: "NL", industry: "automotive", source: "https://www.reuters.com/business/world-at-work/stellantis-offers-voluntary-redundancy-scheme-turin-plant-2025-06-09/" },
  { company: "Altice Portugal", date: "2025-08-06", affected: 1000, percentage: "16.00", country: "PT", countryHq: "PT", industry: "telecom", source: "https://www.bloomberg.com/news/articles/2025-08-06/altice-cuts-1-000-jobs-in-portugal-as-it-adapts-to-ai-cuts-debt" },

  // Osteuropa
  { company: "PKP Cargo", date: "2024-07-03", affected: 4142, percentage: "30.00", country: "PL", countryHq: "PL", industry: "logistics", source: "https://www.reuters.com/markets/europe/polands-top-freight-operator-pkp-cargo-lay-off-up-30-staff-2024-07-03/" },
  { company: "LM Wind Power Blades", date: "2024-04-16", affected: 200, percentage: null, country: "PL", countryHq: "DK", industry: "energy", source: "https://businessinsider.com.pl/gospodarka/masowe-zwolnienia-w-calej-polsce-oto-gdzie-tna-etaty/w15eg6n" },
  { company: "TE Connectivity", date: "2024-04-16", affected: 140, percentage: null, country: "PL", countryHq: "CH", industry: "manufacturing", source: "https://businessinsider.com.pl/gospodarka/masowe-zwolnienia-w-calej-polsce-oto-gdzie-tna-etaty/w15eg6n" },
  { company: "Kiwi.com", date: "2024-01-29", affected: 216, percentage: "18.00", country: "CZ", countryHq: "CZ", industry: "travel", source: "https://brnodaily.com/2024/01/30/news/economy/kiwi-com-cuts-one-fifth-of-jobs-in-the-czech-republic/" },
  { company: "Liberty Ostrava", date: "2024-07-23", affected: 2600, percentage: "52.00", country: "CZ", countryHq: "GB", industry: "manufacturing", source: "https://english.news.cn/europe/20240724/8809b4433f9c46309516e462f7461052/c.html" },
  { company: "Nestle Krupka", date: "2025-06-24", affected: 80, percentage: "20.00", country: "CZ", countryHq: "CH", industry: "manufacturing", source: "https://www.just-food.com/news/nestle-cuts-jobs-at-czech-factory-after-falling-demand-for-plant-based-meat/" },
  { company: "Mitas Yokohama", date: "2025-01-21", affected: 270, percentage: null, country: "CZ", countryHq: "JP", industry: "manufacturing", source: "https://www.expats.cz/czech-news/article/an-industrial-exodus-several-international-companies-are-leaving-czechia" },
  { company: "Dr. Oetker Kladno", date: "2025-01-21", affected: 114, percentage: "61.00", country: "CZ", countryHq: "DE", industry: "manufacturing", source: "https://www.expats.cz/czech-news/article/an-industrial-exodus-several-international-companies-are-leaving-czechia" },
  { company: "Adient", date: "2025-01-21", affected: 1100, percentage: null, country: "CZ", countryHq: "IE", industry: "automotive", source: "https://www.expats.cz/czech-news/article/an-industrial-exodus-several-international-companies-are-leaving-czechia" },
  { company: "Gameloft Cluj", date: "2024-05-13", affected: 136, percentage: "27.00", country: "RO", countryHq: "FR", industry: "gaming", source: "https://www.notebookcheck.net/Gameloft-to-cut-over-100-jobs-in-Cluj-Romania.838090.0.html" },
  { company: "Aumovio Romania", date: "2025-12-03", affected: 641, percentage: "5.00", country: "RO", countryHq: "DE", industry: "automotive", source: "https://www.economica.net/unul-dintre-cei-mai-mari-furnizori-auto-din-romania-disponibilizeaza-641-de-angajati_893970.html" },
  { company: "Chimcomplex", date: "2026-02-27", affected: 1200, percentage: null, country: "RO", countryHq: "RO", industry: "manufacturing", source: "https://www.romania-insider.com/chimcomplex-cut-jobs-feb-2026" },
  { company: "ZF Hungary", date: "2025-02-12", affected: 110, percentage: null, country: "HU", countryHq: "DE", industry: "automotive", source: "https://www.bne.eu/german-automotive-industry-crisis-hits-hungarian-suppliers-366804/" },

  // UK & Irland
  { company: "Lloyds Banking Group", date: "2024-01-25", affected: 1600, percentage: null, country: "GB", countryHq: "GB", industry: "finance", source: "https://www.reuters.com/business/finance/lloyds-cut-around-1600-branch-jobs-digital-switch-2024-01-25/" },
  { company: "Co-operative Bank", date: "2024-03-26", affected: 400, percentage: "12.00", country: "GB", countryHq: "GB", industry: "finance", source: "https://www.reuters.com/world/uk/britains-co-op-bank-plans-400-layoffs-2024-03-26/" },
  { company: "Dyson", date: "2024-07-08", affected: 1000, percentage: "29.00", country: "GB", countryHq: "GB", industry: "technology", source: "https://www.reuters.com/markets/europe/vacuum-cleaner-maker-dyson-cut-up-1000-jobs-uk-ft-2024-07-09/" },
  { company: "Sainsbury's", date: "2025-01-23", affected: 3000, percentage: "2.00", country: "GB", countryHq: "GB", industry: "retail", source: "https://uk.news.yahoo.com/sainsbury-axe-3-000-jobs-145047138.html" },
  { company: "Tesco", date: "2025-01-29", affected: 400, percentage: null, country: "GB", countryHq: "GB", industry: "retail", source: "https://www.reuters.com/business/retail-consumer/uks-tesco-cut-400-jobs-across-stores-head-office-2025-01-29/" },
  { company: "St James's Place", date: "2024-12-02", affected: 500, percentage: "16.00", country: "GB", countryHq: "GB", industry: "finance", source: "https://www.reuters.com/business/finance/st-jamess-place-cut-around-500-jobs-source-says-2024-12-02/" },
  { company: "KPMG UK", date: "2026-03-27", affected: 440, percentage: "6.00", country: "GB", countryHq: "GB", industry: "consulting", source: "https://www.reuters.com/business/finance/kpmg-says-cut-jobs-uk-auditing-division-2026-03-27/" },
  { company: "Morrisons", date: "2026-04-14", affected: 200, percentage: "8.00", country: "GB", countryHq: "GB", industry: "retail", source: "https://www.globalbankingandfinance.com/uks-morrisons-200-jobs-risk-head-office-restructure/" },
  { company: "PayPal Ireland", date: "2024-01-31", affected: 205, percentage: "11.00", country: "IE", countryHq: "US", industry: "fintech", source: "https://www.rte.ie/news/business/2024/0201/1429881-job-losses/" },
  { company: "Three Ireland", date: "2024-01-24", affected: 150, percentage: null, country: "IE", countryHq: "HK", industry: "telecom", source: "https://www.rte.ie/news/2024/0125/1428690-three-ireland-jobs/" },
  { company: "Citigroup Dublin", date: "2024-03-18", affected: 168, percentage: "6.00", country: "IE", countryHq: "US", industry: "finance", source: "https://www.irishtimes.com/business/2024/03/19/citigroup-plans-irish-job-cuts-with-168-roles-at-risk-in-dublin/" },
  { company: "Viatris Cork", date: "2024-07-24", affected: 200, percentage: null, country: "IE", countryHq: "US", industry: "pharma", source: "https://www.rte.ie/news/business/2024/0725/1461709-viatris-to-cut-200-cork-jobs/" },
  { company: "Blizzard Entertainment Ireland", date: "2024-02-18", affected: 136, percentage: "68.00", country: "IE", countryHq: "US", industry: "gaming", source: "https://www.pocketgamer.biz/136-job-cuts-as-blizzard-to-axe-68-of-employees-in-ireland/" },

  // Tech / SaaS / E-Commerce
  { company: "Ericsson Sweden", date: "2024-03-24", affected: 1200, percentage: "9.00", country: "SE", countryHq: "SE", industry: "technology", source: "https://www.dailysabah.com/business/tech/ericsson-to-cut-1200-jobs-in-sweden-amid-challenging-market" },
  { company: "Ericsson Sweden", date: "2026-01-14", affected: 1600, percentage: "13.00", country: "SE", countryHq: "SE", industry: "technology", source: "https://hr.economictimes.indiatimes.com/news/workplace-4-0/talent-management/ericsson-to-shed-1600-jobs-in-sweden/126543908" },
  { company: "Zalando", date: "2025-04-07", affected: 450, percentage: null, country: "DE", countryHq: "DE", industry: "ecommerce", source: "https://ww.fashionnetwork.com/news/European-online-fashion-giant-zalando-to-cut-450-customer-service-jobs-amid-restructuring,1713228.html" },
  { company: "Zalando", date: "2026-01-21", affected: 180, percentage: null, country: "DE", countryHq: "DE", industry: "ecommerce", source: "https://berlin.t-online.de/region/berlin/id_101094788/berlin-zalando-streicht-180-jobs-entlassungen-drohen.html" },
  { company: "Just Eat Takeaway", date: "2025-09-25", affected: 175, percentage: null, country: "NL", countryHq: "NL", industry: "ecommerce", source: "https://www.dutchnews.nl/2025/09/ai-job-cuts-just-eat-takeaway-customer-service/" },
  { company: "Lieferando", date: "2025-07-16", affected: 2000, percentage: null, country: "DE", countryHq: "NL", industry: "ecommerce", source: "https://www.globalbankingandfinance.com/JUST-EAT-GERMANY-LAYOFFS-2409dd0b-93fb-4649-bab7-f0be8f9226ee/" },
  { company: "Intel Leixlip", date: "2025-06-29", affected: 195, percentage: "4.00", country: "IE", countryHq: "US", industry: "technology", source: "https://www.irishtimes.com/ireland/2025/06/30/intel-to-seek-almost-200-mandatory-redundancies-at-leixlip-plant/" },
  { company: "Farfetch", date: "2024-10-18", affected: 2000, percentage: null, country: "GB", countryHq: "GB", industry: "ecommerce", source: "https://www.digitaljournal.com/tech-science/layoffs-in-the-technology-sector-reach-a-new-high/article" },
  { company: "Ocado", date: "2024-10-18", affected: 1000, percentage: null, country: "GB", countryHq: "GB", industry: "ecommerce", source: "https://www.digitaljournal.com/tech-science/layoffs-in-the-technology-sector-reach-a-new-high/article" },
  { company: "Sumo Group", date: "2024-10-18", affected: 250, percentage: null, country: "GB", countryHq: "GB", industry: "gaming", source: "https://www.digitaljournal.com/tech-science/layoffs-in-the-technology-sector-reach-a-new-high/article" },
  { company: "IHS Towers", date: "2024-10-18", affected: 100, percentage: null, country: "GB", countryHq: "GB", industry: "technology", source: "https://www.digitaljournal.com/tech-science/layoffs-in-the-technology-sector-reach-a-new-high/article" },
  { company: "SuperMassive Games", date: "2024-10-18", affected: 90, percentage: null, country: "GB", countryHq: "GB", industry: "gaming", source: "https://www.digitaljournal.com/tech-science/layoffs-in-the-technology-sector-reach-a-new-high/article" },
  { company: "Sourceful", date: "2024-10-18", affected: 80, percentage: null, country: "GB", countryHq: "GB", industry: "technology", source: "https://www.digitaljournal.com/tech-science/layoffs-in-the-technology-sector-reach-a-new-high/article" },
  { company: "XR Games", date: "2024-10-18", affected: 72, percentage: null, country: "GB", countryHq: "GB", industry: "gaming", source: "https://www.digitaljournal.com/tech-science/layoffs-in-the-technology-sector-reach-a-new-high/article" },

  // Travel / Media / Education
  { company: "Expedia Group", date: "2024-02-27", affected: 1500, percentage: "9.00", country: "WW", countryHq: "US", industry: "travel", source: "https://edition.cnn.com/2024/02/27/business/expedia-layoffs-travel-industry" },
  { company: "Channel 4", date: "2024-01-28", affected: 200, percentage: "18.00", country: "GB", countryHq: "GB", industry: "media", source: "https://www.bbc.com/news/entertainment-arts-68127875" },
  { company: "RTL Deutschland", date: "2025-12-02", affected: 600, percentage: "10.00", country: "DE", countryHq: "DE", industry: "media", source: "https://ppc.land/rtl-cuts-600-german-jobs-as-broadcaster-confronts-streaming-shift/" },
  { company: "Utrecht University", date: "2025-06-30", affected: 100, percentage: null, country: "NL", countryHq: "NL", industry: "education", source: "https://www.dutchnews.nl/2025/06/utrecht-university-to-cut-up-to-100-jobs-after-funding-slashed/" },
  { company: "Bangor University", date: "2025-02-19", affected: 200, percentage: null, country: "GB", countryHq: "GB", industry: "education", source: "https://www.bbc.com/news/articles/cd65yl81947o" },
  { company: "University of Edinburgh", date: "2025-04-24", affected: 350, percentage: null, country: "GB", countryHq: "GB", industry: "education", source: "https://www.bbc.com/news/articles/cj9e894z23jo" },
  { company: "University of Lincoln", date: "2024-04-23", affected: 220, percentage: null, country: "GB", countryHq: "GB", industry: "education", source: "https://www.thebusinessdesk.com/eastmidlands/news/2084726-over-220-jobs-at-risk-as-university-plans-30m-savings" },

  // Benelux & DACH
  { company: "Signify", date: "2024-01-26", affected: 500, percentage: null, country: "NL", countryHq: "NL", industry: "manufacturing", source: "https://nltimes.nl/2024/01/26/philips-spin-signify-cut-1000-jobs-market-challenges-ahead" },
  { company: "VDL Nedcar", date: "2024-01-17", affected: 2000, percentage: null, country: "NL", countryHq: "NL", industry: "automotive", source: "https://nltimes.nl/2024/01/17/vdl-nedcar-cutting-2000-employees-today-bmwmini-production-nears-end" },
  { company: "Accell Group", date: "2024-01-30", affected: 150, percentage: null, country: "NL", countryHq: "NL", industry: "manufacturing", source: "https://nltimes.nl/2024/01/30/batavus-sparta-bicycle-parent-company-cut-150-jobs-heerenveen" },
  { company: "LyondellBasell", date: "2025-03-18", affected: 160, percentage: null, country: "NL", countryHq: "NL", industry: "manufacturing", source: "https://industrievandaag.nl/lyondellbasell-maasvlakte-sluiting/" },
  { company: "Tata Steel IJmuiden", date: "2025-04-09", affected: 1600, percentage: "20.00", country: "NL", countryHq: "IN", industry: "manufacturing", source: "https://www.reuters.com/business/tata-steel-cut-around-20-dutch-workforce-anp-news-reports-2025-04-09/" },
  { company: "Barry Callebaut", date: "2024-02-26", affected: 500, percentage: null, country: "BE", countryHq: "CH", industry: "manufacturing", source: "https://www.belganewsagency.eu/barry-callebaut-to-cut-more-than-500-jobs-in-belgium" },
  { company: "Ontex", date: "2024-06-12", affected: 489, percentage: "46.00", country: "BE", countryHq: "BE", industry: "manufacturing", source: "https://www.vrt.be/vrtnws/en/2024/06/13/nappy-producer-ontex-wants-to-axe-nearly-500-flemish-jobs/" },
  { company: "FedEx Belgium", date: "2024-06-12", affected: 385, percentage: "39.00", country: "BE", countryHq: "US", industry: "logistics", source: "https://www.brusselstimes.com/1090139/fedex-cuts-385-jobs-in-belgium" },
  { company: "Van Hool", date: "2024-03-11", affected: 1100, percentage: "44.00", country: "BE", countryHq: "BE", industry: "manufacturing", source: "https://busworldeurope.org/news/van-hool-announces-strategic-realignment-around-1100-jobs-are-lost" },
  { company: "Syngenta", date: "2024-09-10", affected: 150, percentage: "14.00", country: "CH", countryHq: "CH", industry: "manufacturing", source: "https://hr.economictimes.indiatimes.com/news/industry/agrichemicals-company-syngenta-cuts-jobs-in-switzerland/113274711" },
  { company: "Tamedia", date: "2024-08-27", affected: 290, percentage: "16.00", country: "CH", countryHq: "CH", industry: "media", source: "https://uk.marketscreener.com/quote/stock/TX-GROUP-AG-68736/news/Swiss-media-firm-Tamedia-plans-nearly-300-layoffs-printing-work-44736343/" },
  { company: "Swiss Steel", date: "2024-11-15", affected: 130, percentage: "17.00", country: "CH", countryHq: "CH", industry: "manufacturing", source: "https://www.reuters.com/world/europe/swiss-steel-cut-800-jobs-amid-weak-demand-2024-11-15/" },
  { company: "Pfizer Switzerland", date: "2025-12-10", affected: 200, percentage: null, country: "CH", countryHq: "US", industry: "pharma", source: "https://www.reuters.com/sustainability/pfizer-cut-hundreds-jobs-switzerland-reduce-costs-bloomberg-news-reports-2025-12-10/" },
  { company: "Takeda Austria", date: "2024-02-28", affected: 190, percentage: "58.00", country: "AT", countryHq: "JP", industry: "pharma", source: "https://kurier.at/wirtschaft/pharmakonzern-takeda-verkauft-grossteil-seines-werks-in-noe-190-jobs-betroffen/402800503" },
  { company: "Magna Powertrain", date: "2024-09-18", affected: 200, percentage: null, country: "AT", countryHq: "CA", industry: "automotive", source: "https://www.electrive.com/2024/09/19/magna-powertrain-to-cut-200-jobs/" },
  { company: "KTM", date: "2026-01-13", affected: 500, percentage: "20.00", country: "AT", countryHq: "AT", industry: "automotive", source: "https://www.1000ps.com/en-us/article/3013642/ktm-job-cuts-2026-bajaj-mobility-lays-off-500-employees" },
];

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function runImport() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const details: string[] = [];

  await db.transaction(async (tx) => {
    for (const ind of INDUSTRIES_TO_UPSERT) {
      await tx
        .insert(industries)
        .values({
          slug: ind.slug,
          nameEn: ind.nameEn,
          nameDe: ind.nameDe,
          parentSlug: ind.parentSlug,
        })
        .onConflictDoNothing();
    }

    for (const row of LAYOFFS) {
      try {
        const existing = await tx
          .select({ id: companies.id })
          .from(companies)
          .where(sql`LOWER(${companies.name}) = LOWER(${row.company})`)
          .limit(1);

        let companyId: string;

        if (existing.length > 0) {
          companyId = existing[0].id;
        } else {
          const slug = generateSlug(row.company);
          const slugExists = await tx
            .select({ id: companies.id })
            .from(companies)
            .where(eq(companies.slug, slug))
            .limit(1);

          if (slugExists.length > 0) {
            companyId = slugExists[0].id;
          } else {
            const [newCompany] = await tx
              .insert(companies)
              .values({
                name: row.company,
                slug,
                industrySlug: row.industry,
                countryHq: row.countryHq,
                companyType: "enterprise",
              })
              .returning({ id: companies.id });
            companyId = newCompany.id;
          }
        }

        const minDate = addDays(row.date, -7);
        const maxDate = addDays(row.date, 7);

        const dupes = await tx
          .select({ id: layoffs.id, affectedCount: layoffs.affectedCount })
          .from(layoffs)
          .where(
            and(
              eq(layoffs.companyId, companyId),
              gte(layoffs.date, minDate),
              lte(layoffs.date, maxDate),
            ),
          );

        const isDuplicate = dupes.some((d) => {
          if (d.affectedCount == null) return true;
          const diff = Math.abs(d.affectedCount - row.affected);
          return diff <= row.affected * 0.1;
        });

        if (isDuplicate) {
          skipped++;
          details.push(`SKIP  ${row.company} (${row.date})`);
          continue;
        }

        await tx.insert(layoffs).values({
          companyId,
          date: row.date,
          affectedCount: row.affected,
          affectedPercentage: row.percentage,
          country: row.country,
          sourceUrl: row.source,
          sourceName: extractDomain(row.source),
          titleEn: `${row.company} to cut ${row.affected.toLocaleString("en-US")} jobs`,
          titleDe: `${row.company} streicht ${row.affected.toLocaleString("de-DE")} Stellen`,
          status: "verified",
          reason: "restructuring",
          isShutdown: false,
        });

        inserted++;
        details.push(`OK    ${row.company} (${row.date}) — ${row.affected}`);
      } catch (err) {
        errors++;
        details.push(`ERR   ${row.company}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });

  return NextResponse.json({ inserted, skipped, errors, details });
}

export async function GET() {
  return runImport();
}

export async function POST() {
  return runImport();
}
