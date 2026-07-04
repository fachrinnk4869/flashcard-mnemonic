import csv
import json
import os

def parse_csv():
    csv_file_path = '/home/fachrikantor/pribadi/simple-flashcard/vocab_gre.csv'
    js_file_path = '/home/fachrikantor/pribadi/simple-flashcard/data.js'
    
    if not os.path.exists(csv_file_path):
        print(f"Error: CSV file not found at {csv_file_path}")
        return

    cards = []
    with open(csv_file_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = row.get('Kosakata')
            if not word or not word.strip():
                continue
            cards.append({
                'word': word.strip(),
                'definition': row.get('Makna', '').strip(),
                'mnemonic': row.get('Mnemonik', '').strip()
            })

    print(f"Successfully parsed {len(cards)} cards.")
    
    with open(js_file_path, mode='w', encoding='utf-8') as out_f:
        out_f.write("// GRE Vocabulary Data\n")
        out_f.write(f"const flashcardsData = {json.dumps(cards, indent=2, ensure_ascii=False)};\n")
    print(f"Written data to {js_file_path}")

if __name__ == '__main__':
    parse_csv()
