#!/usr/bin/env python3
"""Build data/pois.json from GeoNames dumps.

Cities/towns come from a GeoNames "citiesN" export (feature class P, with
population). Peaks/mountains optionally come from allCountries (feature class T),
which is large (~350 MB download) so it's opt-in.

Usage (via Docker, no local Python needed):
    scripts/build_data.sh                 # cities5000, no peaks
    scripts/build_data.sh cities1000      # denser cities
    scripts/build_data.sh cities5000 peaks  # + mountains/peaks worldwide

Output columns are short keys to keep the JSON small:
    n=name lat lon el=elevation(m) pop=population k=kind
"""
import io
import json
import sys
import urllib.request
import zipfile

BASE = "https://download.geonames.org/export/dump/"
OUT = "data/pois.json"

# GeoNames feature codes we treat as landmark-ish peaks/mountains.
PEAK_CODES = {"PK", "MT", "MTS", "VLC", "HLL", "PKS"}


def fetch_zip(name):
    url = f"{BASE}{name}.zip"
    print(f"downloading {url} ...", file=sys.stderr)
    with urllib.request.urlopen(url) as r:
        data = r.read()
    zf = zipfile.ZipFile(io.BytesIO(data))
    return zf.open(f"{name}.txt")


def kind_for(feature_code, population):
    if feature_code == "PPLC":
        return "city"
    if population >= 100000:
        return "city"
    return "town"


def parse_cities(stream, out):
    for raw in io.TextIOWrapper(stream, encoding="utf-8"):
        c = raw.rstrip("\n").split("\t")
        if len(c) < 17:
            continue
        try:
            lat, lon = float(c[4]), float(c[5])
        except ValueError:
            continue
        pop = int(c[14]) if c[14] else 0
        el = c[15] or c[16] or "0"
        try:
            el = int(float(el))
        except ValueError:
            el = 0
        out.append({"n": c[1], "lat": round(lat, 5), "lon": round(lon, 5),
                    "el": el, "pop": pop, "k": kind_for(c[7], pop)})


def parse_peaks(stream, out):
    kept = 0
    for raw in io.TextIOWrapper(stream, encoding="utf-8"):
        c = raw.rstrip("\n").split("\t")
        if len(c) < 17 or c[6] != "T" or c[7] not in PEAK_CODES:
            continue
        try:
            lat, lon = float(c[4]), float(c[5])
        except ValueError:
            continue
        el = c[15] or c[16] or "0"
        try:
            el = int(float(el))
        except ValueError:
            el = 0
        # Skip minor bumps to avoid a sea of labels; keep anything notable.
        if el and el < 300:
            continue
        out.append({"n": c[1], "lat": round(lat, 5), "lon": round(lon, 5),
                    "el": el, "pop": 0, "k": "peak"})
        kept += 1
    print(f"kept {kept} peaks", file=sys.stderr)


def main():
    cities_set = sys.argv[1] if len(sys.argv) > 1 else "cities5000"
    want_peaks = "peaks" in sys.argv[2:]

    pois = []
    parse_cities(fetch_zip(cities_set), pois)
    print(f"parsed {len(pois)} places from {cities_set}", file=sys.stderr)

    if want_peaks:
        parse_peaks(fetch_zip("allCountries"), pois)

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(pois, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {len(pois)} POIs to {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
