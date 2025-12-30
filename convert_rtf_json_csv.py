import json
import csv
import re

import json
import csv
import re

input_file = '1.json'
output_file = 'final_stores.csv'

def extract_and_clean_json(content):
    # Remove RTF backslashes first
    clean_text = content.replace('\\', '')
    
    # Regex to find JSON objects.
    # We look for a block starting with {
    # Containing "S.No." (header check)
    # Ending with }
    # We use non-greedy matching .*?
    # We assume no nested braces in the data values.
    # Note: re.DOTALL is needed if newlines are inside objects.
    
    # Pattern: { followed by anything, then "S.No.", then anything, then }
    pattern = r'\{.*?"S\.No\.".*?\}'
    
    matches = re.findall(pattern, clean_text, re.DOTALL)
    
    if not matches:
        raise ValueError("No JSON objects found with regex")
        
    print(f"Found {len(matches)} potential records via regex.")
    
    # Join them into a valid list string
    combined_json = "[" + ",".join(matches) + "]"
    
    return combined_json

try:
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        raw_content = f.read()

    clean_json_str = extract_and_clean_json(raw_content)
    
    try:
        data = json.loads(clean_json_str)
    except json.JSONDecodeError as e:
        print(f"Initial JSON parse failed: {e}")
        print("Attempting to recover by fixing common RTF artifacts...")
        # Sometimes RTF puts \par or newlines in strings.
        # Let's hope the replace('\\', '') handled most.
        raise e

    print(f"Successfully parsed {len(data)} records.")

    # CSV Headers - using camelCase to match Backend/Frontend Schema DIRECTLY
    headers = ['serialNumber', 'storeName', 'area', 'distributor', 'salesCaptain', 'beat', 'contactNumber']

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        # Note: 'S.No.' is mapped but not in headers? 
        # Wait, frontend `importCSV` matches headers. Backend schema expects 'storeName'.
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        
        for row in data:
            # Map source keys (UPPERCASE with spaces) to target camelCase
            clean_row = {
                'serialNumber': row.get('S.No.', '').strip(),
                'storeName': row.get('STORE NAME', '').strip(),
                'area': row.get('AREA', '').strip(),
                'distributor': row.get('DISTRIBUTOR', '').strip(),
                'salesCaptain': row.get('SALES CAPTAIN', '').strip(),
                'beat': '', # Force blank
                'contactNumber': '' # Force blank
            }
            writer.writerow(clean_row)

    print(f"Successfully wrote {output_file}")

except Exception as e:
    print(f"An error occurred: {e}")
    if 'clean_json_str' in locals():
        print("Snippet:", clean_json_str[:100], "...", clean_json_str[-100:])


