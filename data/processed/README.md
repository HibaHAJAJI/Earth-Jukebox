
# Earth Jukebox - Processed Data

## Project Description

This folder contains processed global temperature anomaly data for the Earth Jukebox project.

## Data Source

NASA GISS GISTEMP v4.

## Time Range

1880 - 2025

## Files

### 1. full_dataset.csv

- 146 rows
- 22 columns
- Contains monthly and annual temperature data, decade information, moving average and linear trend.

### 2. sonification_dataset.csv

- 146 rows
- 4 columns:
  - Year
  - J-D
  - Moving_Average_10Y
  - Trend

### 3. sonification_dataset.json

- Contains 146 annual records.
- Includes dataset metadata and structured data records.
- Designed for integration with the backend and sonification system.

## JSON Structure

The JSON file contains two main sections:

### Dataset Metadata

- `dataset`: Dataset identifier (`global_temperature_anomaly`).
- `source`: Original data source (NASA GISS GISTEMP v4).
- `unit`: Temperature measurement unit (degrees Celsius, °C).
- `data`: Array containing annual temperature records.

### Data Fields

Each object inside the `data` array contains:

| Field | Data Type | Description |
|---|---|---|
| `year` | Integer | Observation year. |
| `temperature` | Float | Annual global temperature anomaly. |
| `moving_average_10y` | Float / null | 10-year moving average. |
| `trend` | Float | Value calculated from the linear trend. |

## Data Processing

- Data inspection and validation.
- Missing values analysis.
- Decade analysis.
- 10-Year Moving Average calculation.
- Linear Trend calculation.
- Data visualization.
- CSV to JSON conversion.
- JSON structure validation.

## Missing Values

The first 9 values of the 10-Year Moving Average are null because 10 years of observations are required to calculate the first complete 10-year moving average.

Missing seasonal values in the original dataset are preserved and not artificially replaced.

Null values represent unavailable observations or calculations, not zero.

## Units

Temperature anomaly is expressed in degrees Celsius (°C).

## Backend Integration

The `sonification_dataset.json` file provides structured annual temperature data for backend integration.

The backend can access:

- Dataset metadata.
- Annual temperature values.
- 10-year moving averages.
- Linear trend values.

The JSON structure should be used as the reference when mapping the dataset to backend models.
