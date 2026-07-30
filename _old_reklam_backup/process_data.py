import os
import glob
import csv
import json

DATA_DIR = '/Users/dilovan/Downloads/TUR/DATA'
OUTPUT_DIR = '/Users/dilovan/Downloads/reklam/data'
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'adnet_emissions_db.json')

def clean_company_name(raw_name):
    if not raw_name: return ""
    name = raw_name.strip()
    if "->" in name:
        name = name.split("->")[0].strip()
    name = name.split("[")[0].strip()
    
    ignored = [
        "small shareholder(s)", "natural person(s)", "unknown", "n/a", 
        "state of turkey", "republic of turkey", "government of türkiye", "government of turkey",
        "ministry of national defense", "ministry of finance", "ministry of treasury", "republic of czech",
        "india", "unit trust of india", "life insurance corporation of india", "blackrock", "vanguard", "norges bank",
        "qatar investment", "government of qatar", "qatar holding", "artisan partners", "spohn cement"
    ]
    
    for ig in ignored:
        if ig in name.lower():
            return ""
            
    if len(name) < 3:
        return ""
    return name

def translate_sector(sector):
    s = str(sector).lower()
    if 'power' in s or 'electricity' in s: return 'Enerji'
    if 'manufacturing' in s or 'industry' in s or 'steel' in s or 'cement' in s: return 'İmalat & Sanayi'
    if 'transport' in s or 'aviation' in s or 'shipping' in s: return 'Ulaştırma & Lojistik'
    if 'mineral' in s or 'mining' in s or 'fossil' in s or 'gas' in s: return 'Maden & Hammadde'
    if 'building' in s or 'construction' in s: return 'İnşaat & Binalar'
    if 'agriculture' in s: return 'Tarım & Hayvancılık'
    if 'waste' in s: return 'Atık Yönetimi'
    return 'İmalat & Sanayi'

def process_emissions():
    print("Starting Climate TRACE TUR Data Aggregation (Strict Real Data, No Multipliers)...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    sector_yearly = {}
    total_yearly = {}
    company_data = {}
    facilities_by_sector = {}
    asset_emissions_map = {}
    
    csv_files = glob.glob(DATA_DIR + '/**/*.csv', recursive=True)
    print(f"Found {len(csv_files)} CSV files in dataset.")
    
    # 1. Parse Country Emissions CSVs
    country_csvs = [f for f in csv_files if 'country_emissions' in f]
    for c_file in country_csvs:
        try:
            with open(c_file, mode='r', encoding='utf-8', errors='ignore') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    gas = row.get('gas', '')
                    if gas in ['co2e_20yr', 'co2e_100yr']:
                        sector = row.get('sector', 'other')
                        start_time = row.get('start_time', '').strip()
                        year = start_time[:4] if start_time else '2023'
                        
                        try:
                            qty = float(row.get('emissions_quantity', 0) or 0)
                        except ValueError:
                            qty = 0.0

                        if year != '2026':  # Ignore partial projected 2026 year
                            if sector not in sector_yearly: sector_yearly[sector] = {}
                            if year not in sector_yearly[sector]: sector_yearly[sector][year] = {'co2e_20yr': 0.0}
                            sector_yearly[sector][year]['co2e_20yr'] += qty

                            if year not in total_yearly: total_yearly[year] = 0.0
                            total_yearly[year] += qty
        except Exception:
            pass

    # 2. Parse Facilities & Sources CSVs for Asset Measured Emissions & Map Coordinates
    facility_csvs = [f for f in csv_files if 'facilities' in f or 'sources' in f]
    seen_facilities = set()
    
    for f_file in facility_csvs:
        try:
            dir_sector = f_file.split('/')[-2]
            sec = translate_sector(dir_sector)
            if sec not in facilities_by_sector:
                facilities_by_sector[sec] = []

            with open(f_file, mode='r', encoding='utf-8', errors='ignore') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    lat_str = row.get('lat', '').strip() or row.get('latitude', '').strip()
                    lon_str = row.get('lon', '').strip() or row.get('longitude', '').strip()
                    name = row.get('source_name', '').strip() or row.get('name', '').strip() or row.get('asset_name', '').strip()
                    
                    try:
                        emissions = float(row.get('emissions_quantity', 0) or row.get('co2e_20yr', 0) or 0)
                    except ValueError:
                        emissions = 0.0

                    if name and emissions > 0:
                        if name not in asset_emissions_map: asset_emissions_map[name] = 0.0
                        asset_emissions_map[name] += emissions

                    if lat_str and lon_str:
                        try:
                            lat = float(lat_str)
                            lon = float(lon_str)
                            if 35.0 <= lat <= 43.0 and 25.0 <= lon <= 45.0:
                                fac_key = f"{round(lat, 3)}_{round(lon, 3)}"
                                if fac_key not in seen_facilities:
                                    seen_facilities.add(fac_key)
                                    facilities_by_sector[sec].append({
                                        "name": name if name else f"{sec} Tesisi",
                                        "sector": sec,
                                        "lat": lat,
                                        "lon": lon,
                                        "emissions_tonnes": round(emissions, 1)
                                    })
                        except ValueError:
                            pass
        except Exception:
            pass

    # 3. Parse Ownership & Companies CSVs (Strict Mapping to Measured Asset Emissions)
    ownership_csvs = [f for f in csv_files if 'ownership' in f]
    for o_file in ownership_csvs:
        try:
            dir_sector = o_file.split('/')[-2]
            with open(o_file, mode='r', encoding='utf-8', errors='ignore') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    raw_owner = row.get('parent_name', '').strip() or row.get('owner_name', '').strip()
                    c_name = clean_company_name(raw_owner)
                    if not c_name: continue

                    asset_name = row.get('source_name', '').strip() or row.get('asset_name', '').strip() or ''
                    raw_sec = row.get('sector', '').strip() or row.get('source_sector', '').strip() or dir_sector
                    sec = translate_sector(raw_sec)
                    
                    asset_qty = asset_emissions_map.get(asset_name, 0.0)

                    if c_name not in company_data:
                        company_data[c_name] = {
                            "name": c_name,
                            "sectors": set([sec]),
                            "assets": set([asset_name]) if asset_name else set(),
                            "ownership_paths": set([c_name]),
                            "measured_co2e": asset_qty
                        }
                    else:
                        company_data[c_name]["sectors"].add(sec)
                        if asset_name: company_data[c_name]["assets"].add(asset_name)
                        company_data[c_name]["measured_co2e"] += asset_qty
        except Exception:
            pass

    # Balanced facilities collection: take up to 80 facilities from each sector
    final_facilities = []
    for sec_name, fac_list in facilities_by_sector.items():
        fac_list.sort(key=lambda x: x["emissions_tonnes"], reverse=True)
        final_facilities.extend(fac_list[:80])

    domain_map = {
        'koc': 'koc.com.tr', 'sabanci': 'sabanci.com', 'erdemir': 'erdemir.com.tr',
        'eregli': 'erdemir.com.tr', 'ataer': 'erdemir.com.tr', 'ordu yardımlaşma': 'oyak.com.tr',
        'oyak': 'oyak.com.tr', 'limak': 'limak.com.tr', 'cengiz': 'cengiz.com.tr',
        'eren holding': 'erenholding.com.tr', 'celikler': 'celiklerholding.net', 'çelikler': 'celiklerholding.net',
        'icdaş': 'icdas.com.tr', 'içdaş': 'icdas.com.tr', 'sisecam': 'sisecam.com.tr',
        'şişecam': 'sisecam.com.tr', 'borusan': 'borusan.com', 'zorlu': 'zorlu.com.tr',
        'sanko': 'sanko.com.tr', 'elektrik uretim': 'euas.gov.tr', 'eüaş': 'euas.gov.tr',
        'enerjisa': 'enerjisa.com.tr', 'tupras': 'tupras.com.tr', 'tüpraş': 'tupras.com.tr',
        'arcelik': 'arcelik.com', 'arçelik': 'arcelik.com', 'ford': 'fordotosan.com.tr',
        'tofaş': 'tofas.com.tr', 'tofas': 'tofas.com.tr', 'aygaz': 'aygaz.com.tr',
        'akçansa': 'akcansa.com.tr', 'akcansa': 'akcansa.com.tr', 'çimsa': 'cimsa.com.tr',
        'cimsa': 'cimsa.com.tr', 'kordsa': 'kordsa.com', 'tekfen': 'tekfen.com.tr',
        'rönesans': 'ronesans.com', 'alarko': 'alarko.com.tr', 'kibar': 'kibar.com',
        'yıldız': 'yildizholding.com.tr', 'yildiz': 'yildizholding.com.tr',
        'doğan': 'doganholding.com.tr', 'dogan': 'doganholding.com.tr',
        'eczacıbaşı': 'eczacibasi.com.tr', 'eczacibasi': 'eczacibasi.com.tr',
        'anadolu': 'anadolugrubu.com.tr', 'türk hava yolları': 'turkishairlines.com',
        'turkish airlines': 'turkishairlines.com', 'petkim': 'petkim.com.tr',
        'socar': 'socar.com.tr', 'kardemir': 'kardemir.com', 'isdemir': 'isdemir.com.tr',
        'sasa': 'sasa.com.tr', 'vestel': 'vestel.com.tr', 'aselsan': 'aselsan.com.tr',
        'tusaş': 'tusas.com.tr'
    }

    # Final companies list (ONLY measured real Climate TRACE data, no multipliers)
    final_companies = []
    for c_name, c_info in company_data.items():
        if len(c_info["assets"]) > 0:
            name_lower = c_name.lower()
            found_dom = None
            for k, dom in domain_map.items():
                if k in name_lower:
                    found_dom = dom
                    break

            final_companies.append({
                "name": c_info["name"],
                "domain": found_dom,
                "logo_url": f"https://logo.clearbit.com/{found_dom}" if found_dom else None,
                "sectors": list(c_info["sectors"]),
                "assets": list(c_info["assets"]),
                "ownership_paths": list(c_info["ownership_paths"]),
                "est_co2e_annual": round(c_info["measured_co2e"], 1)
            })

    final_companies.sort(key=lambda x: x["est_co2e_annual"], reverse=True)

    db_output = {
        "summary": {
            "country": "Türkiye",
            "dataset": "Climate TRACE v5.8.0",
            "years_covered": "2015-2025",
            "total_companies_mapped": len(final_companies),
            "total_facilities_mapped": len(final_facilities)
        },
        "total_yearly": total_yearly,
        "sector_yearly": sector_yearly,
        "companies": final_companies,
        "facilities": final_facilities
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(db_output, f, ensure_ascii=False, indent=2)

    print(f"Successfully generated {OUTPUT_FILE} with strict measured Climate TRACE emissions.")

if __name__ == '__main__':
    process_emissions()
