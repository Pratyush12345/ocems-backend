import json
from datetime import datetime, timedelta
import random

# Function to generate random data for a given date
def generate_data_for_date(date):
    data_for_date = {
        'date': date.strftime('%Y-%m-%d'),
        'values': {}
    }

    current_time = datetime.strptime('00:00', '%H:%M')

    for _ in range(48):
        data_for_date['values'][current_time.strftime('%H:%M')] = random.randint(100, 200)
        current_time += timedelta(minutes=30)

    return data_for_date

# Function to generate data for the entire date range
def generate_data_for_date_range(start_date, end_date):
    data = {'data': []}

    current_date = start_date

    while current_date <= end_date:
        data['data'].append(generate_data_for_date(current_date))
        current_date += timedelta(days=1)

    return data

# Set the date range
start_date = datetime.strptime('2023-01-01', '%Y-%m-%d')
end_date = datetime.strptime('2023-12-31', '%Y-%m-%d')

# Generate data for the date range
generated_data = generate_data_for_date_range(start_date, end_date)

# Save the data to a JSON file
with open('generated_data.json', 'w') as json_file:
    json.dump(generated_data, json_file, indent=4)

print('Data generation completed. Check generated_data.json.')
