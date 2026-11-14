#!/usr/bin/env python3
"""Build the monthly GISTEMP v4 temperature dataset for Earth Jukebox.

The script reads the original NASA GISS GISTEMP v4 global land-ocean
monthly anomaly CSV, converts it to a long-form monthly JSON series, and
writes the same artifact to the processed-data folder and to the Spring
Boot resources folder.

It never invents values. Source missing markers (``***``) are preserved as
JSON ``null``. The annual dataset is not read and is not modified here.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from datetime import date
from pathlib import Path
from typing import Any

MONTH_COLUMNS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]

EXPECTED_FIRST_YEAR = 1880
EXPECTED_LAST_YEAR = 2026
MISSING_TOKENS = {"", "***", "**", "*", "nan", "null"}

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_FILE = PROJECT_ROOT / "data" / "raw" / "GLB.Ts+dSST.csv"
PROCESSED_OUTPUT = PROJECT_ROOT / "data" / "processed" / "monthly_temperature_anomaly.json"
BACKEND_OUTPUT = (
    PROJECT_ROOT
    / "backend"
    / "src"
    / "main"
    / "resources"
    / "monthly_temperature_anomaly.json"
)
MANIFEST_OUTPUT = (
    PROJECT_ROOT / "data" / "processed" / "monthly_temperature_anomaly.manifest.json"
)

SOURCE_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
SOURCE_PAGE_URL = "https://data.giss.nasa.gov/gistemp/data_v4.html"
PHENOMENON_ID = "global-temperature-anomaly"


def parse_float(value: str | None) -> float | None:
    if value is None:
        return None

    token = value.strip()
    if token.lower() in MISSING_TOKENS or re.fullmatch(r"\*+", token):
        return None

    try:
        return float(token)
    except ValueError as error:
        raise ValueError(f"Unexpected temperature value: {value!r}") from error


def read_raw_rows(path: Path) -> tuple[list[dict[str, Any]], str]:
    if not path.is_file():
        raise FileNotFoundError(f"Raw GISTEMP file not found: {path}")

    digest = hashlib.sha256(path.read_bytes()).hexdigest()

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        first_line = handle.readline().strip()
        if "Global Means" not in first_line:
            raise ValueError(
                "Unexpected GISTEMP file header. Expected a 'Land-Ocean: Global Means' line."
            )

        reader = csv.DictReader(handle)
        if reader.fieldnames is None or "Year" not in reader.fieldnames:
            raise ValueError("GISTEMP CSV is missing the Year column.")

        missing_columns = [column for column in MONTH_COLUMNS if column not in reader.fieldnames]
        if missing_columns:
            raise ValueError(f"GISTEMP CSV is missing month columns: {missing_columns}")

        rows: list[dict[str, Any]] = []
        for raw_row in reader:
            year_token = (raw_row.get("Year") or "").strip()
            if not year_token:
                continue

            year = int(year_token)
            records = []
            for month, column in enumerate(MONTH_COLUMNS, start=1):
                records.append(
                    {
                        "year": year,
                        "month": month,
                        "anomaly": parse_float(raw_row.get(column)),
                    }
                )

            rows.append(
                {
                    "year": year,
                    "records": records,
                }
            )

    return rows, digest


def build_dataset(rows: list[dict[str, Any]], raw_sha256: str, retrieved_at: str) -> dict[str, Any]:
    records = [record for row in rows for record in row["records"]]
    records.sort(key=lambda record: (record["year"], record["month"]))

    if not records:
        raise ValueError("No monthly records were parsed from the GISTEMP file.")

    years = sorted({record["year"] for record in records})
    expected_years = list(range(EXPECTED_FIRST_YEAR, EXPECTED_LAST_YEAR + 1))
    if years != expected_years:
        missing_years = sorted(set(expected_years) - set(years))
        unexpected_years = sorted(set(years) - set(expected_years))
        raise ValueError(
            f"Unexpected year coverage. Missing={missing_years}, unexpected={unexpected_years}."
        )

    seen: set[tuple[int, int]] = set()
    for record in records:
        key = (record["year"], record["month"])
        if key in seen:
            raise ValueError(f"Duplicate year/month record: {key}")
        seen.add(key)

        if record["month"] < 1 or record["month"] > 12:
            raise ValueError(f"Invalid month: {record}")

        anomaly = record["anomaly"]
        if anomaly is not None and not (-2.0 <= anomaly <= 2.0):
            raise ValueError(f"Temperature anomaly outside the expected range: {record}")

    expected_positions = len(expected_years) * 12
    if len(records) != expected_positions:
        raise ValueError(
            f"Expected {expected_positions} monthly positions, got {len(records)}."
        )

    numeric_records = [record for record in records if record["anomaly"] is not None]
    missing_records = [record for record in records if record["anomaly"] is None]

    first = records[0]
    last = records[-1]

    metadata = {
        "id": PHENOMENON_ID,
        "title": "Global Surface Temperature Anomaly",
        "source": "NASA GISS GISTEMP v4",
        "sourceUrl": SOURCE_PAGE_URL,
        "sourceDataUrl": SOURCE_URL,
        "unit": "°C",
        "baseline": "1951-1980",
        "frequency": "monthly",
        "startYear": first["year"],
        "endYear": last["year"],
        "startMonth": f"{first['year']:04d}-{first['month']:02d}",
        "endMonth": f"{last['year']:04d}-{last['month']:02d}",
        "recordCount": len(records),
        "numericCount": len(numeric_records),
        "missingCount": len(missing_records),
        "missingPolicy": "preserved-as-null",
        "missingMonths": [
            f"{record['year']:04d}-{record['month']:02d}"
            for record in missing_records
        ],
        "isMock": False,
        "retrievedAt": retrieved_at,
        "rawFile": "data/raw/GLB.Ts+dSST.csv",
        "rawSha256": raw_sha256,
        "dataVersion": f"gistemp-v4-{raw_sha256[:12]}",
        "license": "NASA GISS GISTEMP v4 public data; attribution required.",
        "notes": (
            "Monthly global land-ocean temperature anomalies in degrees Celsius, "
            "relative to the 1951-1980 baseline. Missing source values are null, "
            "not zero. October-December 2026 were not yet reported in the raw file."
        ),
    }

    return {"metadata": metadata, "data": records}


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False, allow_nan=False) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--retrieved-at",
        default=date.today().isoformat(),
        help="Source retrieval date recorded in the metadata (YYYY-MM-DD).",
    )
    args = parser.parse_args()

    rows, raw_sha256 = read_raw_rows(RAW_FILE)
    dataset = build_dataset(rows, raw_sha256, args.retrieved_at)

    write_json(PROCESSED_OUTPUT, dataset)
    write_json(BACKEND_OUTPUT, dataset)

    manifest = {
        "dataset": dataset["metadata"]["id"],
        "dataVersion": dataset["metadata"]["dataVersion"],
        "rawFile": dataset["metadata"]["rawFile"],
        "rawSha256": raw_sha256,
        "sourceUrl": SOURCE_URL,
        "retrievedAt": args.retrieved_at,
        "generatedOn": date.today().isoformat(),
        "coverage": {
            "from": dataset["metadata"]["startMonth"],
            "to": dataset["metadata"]["endMonth"],
            "years": [
                dataset["metadata"]["startYear"],
                dataset["metadata"]["endYear"],
            ],
            "monthlyPositions": dataset["metadata"]["recordCount"],
            "numericValues": dataset["metadata"]["numericCount"],
            "missingValues": dataset["metadata"]["missingCount"],
        },
        "validation": {
            "yearsContinuous": True,
            "monthsComplete": True,
            "duplicateYearMonths": 0,
            "outOfRangeValues": 0,
            "missingPolicy": "preserved-as-null",
        },
        "outputs": [
            PROCESSED_OUTPUT.relative_to(PROJECT_ROOT).as_posix(),
            BACKEND_OUTPUT.relative_to(PROJECT_ROOT).as_posix(),
        ],
    }
    write_json(MANIFEST_OUTPUT, manifest)

    metadata = dataset["metadata"]
    print("Monthly dataset written successfully.")
    print(f"  Coverage: {metadata['startMonth']} to {metadata['endMonth']}")
    print(f"  Monthly positions: {metadata['recordCount']}")
    print(f"  Numeric values: {metadata['numericCount']}")
    print(f"  Missing values: {metadata['missingCount']} ({metadata['missingMonths']})")
    print(f"  Data version: {metadata['dataVersion']}")
    print(f"  Processed: {PROCESSED_OUTPUT.relative_to(PROJECT_ROOT)}")
    print(f"  Backend:   {BACKEND_OUTPUT.relative_to(PROJECT_ROOT)}")
    print(f"  Manifest:  {MANIFEST_OUTPUT.relative_to(PROJECT_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
