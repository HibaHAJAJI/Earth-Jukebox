
# Earth Jukebox - Processed Data

## Project Description
This folder contains processed global temperature anomaly
data for the Earth Jukebox project.

## Data Source
NASA GISS GISTEMP v4.

## Time Range
1880 - 2025

## Files

### 1. full_dataset.csv
- 146 rows
- 22 columns
- Contains monthly and annual temperature data,
  decade information, moving average and linear trend.

### 2. sonification_dataset.csv
- 146 rows
- 4 columns:
  - Year
  - J-D
  - Moving_Average_10Y
  - Trend

## Data Processing
- Data inspection and validation.
- Missing values analysis.
- Decade analysis.
- 10-Year Moving Average calculation.
- Linear Trend calculation.
- Data visualization.

## Missing Values
The first 9 values of the 10-Year Moving Average
are NaN because 10 years of observations are required.

Missing seasonal values in the original dataset
are preserved and not artificially replaced.

## Units
Temperature anomaly is expressed in degrees Celsius (°C).
