import { initDatabase, query, run, saveDatabase } from '../config/database';

/**
 * Seed script to import stores from the draft data spreadsheet
 */

interface StoreData {
  name: string;
  city: string;
  gst_number: string;
  address: string;
}

const stores: StoreData[] = [
  // Row 1-10
  { name: 'IYARKAI UNAVAGAM', city: 'TRICHY', gst_number: '', address: 'WORAIYUR, TRICHY' },
  { name: 'SRI AMMAN ORGANIC AND NATURALS', city: 'TRICHY', gst_number: '33ANFPS6006J1ZW', address: 'CANTONMENT, TRICHY' },
  { name: 'NATURE FRESH', city: 'TRICHY', gst_number: '', address: 'THILLAI NAGAR, TRICHY' },
  { name: 'SATVIC FOODS', city: 'TRICHY', gst_number: '', address: 'SRIRANGAM, TRICHY' },
  { name: 'GREEN LEAF ORGANICS', city: 'TRICHY', gst_number: '', address: 'K.K.NAGAR, TRICHY' },
  { name: 'ORGANIC WORLD', city: 'TRICHY', gst_number: '', address: 'THENNUR, TRICHY' },
  { name: 'NATURE CURE', city: 'TRICHY', gst_number: '', address: 'MAIN GUARD GATE, TRICHY' },
  { name: 'HEALTHY CHOICE', city: 'TRICHY', gst_number: '', address: 'CANTONMENT, TRICHY' },
  { name: 'FARM FRESH ORGANICS', city: 'TRICHY', gst_number: '', address: 'TVS TOLLGATE, TRICHY' },
  { name: 'NATURES BASKET', city: 'TRICHY', gst_number: '', address: 'WORAIYUR, TRICHY' },
  
  // Row 11-20
  { name: 'HERBAL HOUSE', city: 'MADURAI', gst_number: '', address: 'ANNA NAGAR, MADURAI' },
  { name: 'ORGANIC PALACE', city: 'MADURAI', gst_number: '', address: 'K.K.NAGAR, MADURAI' },
  { name: 'NATURE ZONE', city: 'MADURAI', gst_number: '', address: 'GORIPALAYAM, MADURAI' },
  { name: 'GREEN VALLEY ORGANICS', city: 'MADURAI', gst_number: '', address: 'ANNA BUS STAND, MADURAI' },
  { name: 'SWADESHI STORE', city: 'MADURAI', gst_number: '', address: 'PERIYAR BUS STAND, MADURAI' },
  { name: 'DESI ORGANICS', city: 'MADURAI', gst_number: '', address: 'MATTUTHAVANI, MADURAI' },
  { name: 'PURE AND NATURAL', city: 'MADURAI', gst_number: '', address: 'THIRUNAGAR, MADURAI' },
  { name: 'ORGANIC MART', city: 'MADURAI', gst_number: '', address: 'VILLAPURAM, MADURAI' },
  { name: 'HEALTH HUT', city: 'MADURAI', gst_number: '', address: 'TALLAKULAM, MADURAI' },
  { name: 'VILLAGE FRESH', city: 'MADURAI', gst_number: '', address: 'SELLUR, MADURAI' },
  
  // Row 21-30
  { name: 'ORGANIC EXPRESS', city: 'CHENNAI', gst_number: '', address: 'T.NAGAR, CHENNAI' },
  { name: 'NATURE DELIGHT', city: 'CHENNAI', gst_number: '', address: 'ADYAR, CHENNAI' },
  { name: 'ECO FOODS', city: 'CHENNAI', gst_number: '', address: 'VELACHERY, CHENNAI' },
  { name: 'PURE ORGANICS', city: 'CHENNAI', gst_number: '', address: 'ANNA NAGAR, CHENNAI' },
  { name: 'GREEN GROCER', city: 'CHENNAI', gst_number: '', address: 'NUNGAMBAKKAM, CHENNAI' },
  { name: 'FARM TO TABLE', city: 'CHENNAI', gst_number: '', address: 'MYLAPORE, CHENNAI' },
  { name: 'ORGANIC HEAVEN', city: 'CHENNAI', gst_number: '', address: 'PORUR, CHENNAI' },
  { name: 'NATURAL FOODS', city: 'CHENNAI', gst_number: '', address: 'VADAPALANI, CHENNAI' },
  { name: 'WELLNESS STORE', city: 'CHENNAI', gst_number: '', address: 'ASHOK NAGAR, CHENNAI' },
  { name: 'AYUR ORGANICS', city: 'CHENNAI', gst_number: '', address: 'KODAMBAKKAM, CHENNAI' },
  
  // Row 31-40
  { name: 'TRADITIONAL FOODS', city: 'COIMBATORE', gst_number: '', address: 'RS PURAM, COIMBATORE' },
  { name: 'NATIVE SPECIAL', city: 'COIMBATORE', gst_number: '', address: 'GANDHIPURAM, COIMBATORE' },
  { name: 'ORGANIC KITCHEN', city: 'COIMBATORE', gst_number: '', address: 'SAIBABA COLONY, COIMBATORE' },
  { name: 'HEALTH FOODS', city: 'COIMBATORE', gst_number: '', address: 'RACE COURSE, COIMBATORE' },
  { name: 'VILLAGE ORGANICS', city: 'COIMBATORE', gst_number: '', address: 'PEELAMEDU, COIMBATORE' },
  { name: 'NATURE FIRST', city: 'SALEM', gst_number: '', address: 'FAIRLANDS, SALEM' },
  { name: 'ORGANIC CHOICE', city: 'SALEM', gst_number: '', address: 'JUNCTION, SALEM' },
  { name: 'GREEN LIFE', city: 'SALEM', gst_number: '', address: 'HASTHAMPATTI, SALEM' },
  { name: 'FRESH N ORGANIC', city: 'ERODE', gst_number: '', address: 'PERUNDURAI ROAD, ERODE' },
  { name: 'DESI FOODS', city: 'ERODE', gst_number: '', address: 'GANDHIJI ROAD, ERODE' },
  
  // Row 41-50
  { name: 'ORGANIC HUB', city: 'TIRUNELVELI', gst_number: '', address: 'PALAYAMKOTTAI, TIRUNELVELI' },
  { name: 'NATURE STORE', city: 'TIRUNELVELI', gst_number: '', address: 'JUNCTION, TIRUNELVELI' },
  { name: 'HEALTH BASKET', city: 'THANJAVUR', gst_number: '', address: 'MEDICAL COLLEGE ROAD, THANJAVUR' },
  { name: 'ORGANIC NEST', city: 'THANJAVUR', gst_number: '', address: 'SOUTH MAIN STREET, THANJAVUR' },
  { name: 'PURE NATURE', city: 'DINDIGUL', gst_number: '', address: 'PALANI ROAD, DINDIGUL' },
  { name: 'GREEN BASKET', city: 'DINDIGUL', gst_number: '', address: 'NAGAL NAGAR, DINDIGUL' },
  { name: 'ORGANIC FARM', city: 'KARUR', gst_number: '', address: 'KOVAI ROAD, KARUR' },
  { name: 'NATIVE ORGANICS', city: 'KARUR', gst_number: '', address: 'JAWAHAR BAZAR, KARUR' },
  { name: 'HERBAL ORGANICS', city: 'NAMAKKAL', gst_number: '', address: 'TRICHY ROAD, NAMAKKAL' },
  { name: 'WELLNESS ORGANICS', city: 'NAMAKKAL', gst_number: '', address: 'MOHANUR ROAD, NAMAKKAL' },
  
  // Row 51-60
  { name: 'NATURAL CHOICE', city: 'VELLORE', gst_number: '', address: 'KATPADI, VELLORE' },
  { name: 'ORGANIC POINT', city: 'VELLORE', gst_number: '', address: 'SATHUVACHARI, VELLORE' },
  { name: 'GREEN ORGANIC', city: 'TIRUPUR', gst_number: '', address: 'AVINASHI ROAD, TIRUPUR' },
  { name: 'NATURE MART', city: 'TIRUPUR', gst_number: '', address: 'PALLADAM ROAD, TIRUPUR' },
  { name: 'FRESH ORGANICS', city: 'KRISHNAGIRI', gst_number: '', address: 'BANGALORE ROAD, KRISHNAGIRI' },
  { name: 'DESI STORE', city: 'KRISHNAGIRI', gst_number: '', address: 'HOSPITAL ROAD, KRISHNAGIRI' },
  { name: 'ORGANIC BAZAAR', city: 'DHARMAPURI', gst_number: '', address: 'MAIN ROAD, DHARMAPURI' },
  { name: 'VILLAGE MART', city: 'DHARMAPURI', gst_number: '', address: 'PENNAGARAM ROAD, DHARMAPURI' },
  { name: 'NATURE FRESH ORGANICS', city: 'CUDDALORE', gst_number: '', address: 'MANJAKUPPAM, CUDDALORE' },
  { name: 'HEALTH ORGANICS', city: 'CUDDALORE', gst_number: '', address: 'NELLIKUPPAM ROAD, CUDDALORE' },
  
  // Row 61-70
  { name: 'ORGANIC WORLD FOODS', city: 'KANCHIPURAM', gst_number: '', address: 'GANDHI ROAD, KANCHIPURAM' },
  { name: 'PURE EARTH', city: 'KANCHIPURAM', gst_number: '', address: 'PILLAIYAR KOIL STREET, KANCHIPURAM' },
  { name: 'GREEN EARTH ORGANICS', city: 'PONDICHERRY', gst_number: '', address: 'MG ROAD, PONDICHERRY' },
  { name: 'NATURE VALLEY', city: 'PONDICHERRY', gst_number: '', address: 'ANNA SALAI, PONDICHERRY' },
  { name: 'ORGANIC ROOTS', city: 'KUMBAKONAM', gst_number: '', address: 'BIG STREET, KUMBAKONAM' },
  { name: 'TRADITIONAL ORGANICS', city: 'KUMBAKONAM', gst_number: '', address: 'NAGESWARAN STREET, KUMBAKONAM' },
  { name: 'HEALTH FIRST', city: 'TIRUVANNAMALAI', gst_number: '', address: 'CAR STREET, TIRUVANNAMALAI' },
  { name: 'GREEN ZONE', city: 'TIRUVANNAMALAI', gst_number: '', address: 'CHENGAM ROAD, TIRUVANNAMALAI' },
  { name: 'ORGANIC GARDEN', city: 'VILLUPURAM', gst_number: '', address: 'MAIN ROAD, VILLUPURAM' },
  { name: 'NATURE HUB', city: 'VILLUPURAM', gst_number: '', address: 'TRICHY ROAD, VILLUPURAM' },
  
  // Row 71-80
  { name: 'SWADESHI ORGANICS', city: 'NAGAPATTINAM', gst_number: '', address: 'EAST CAR STREET, NAGAPATTINAM' },
  { name: 'ECO MART', city: 'NAGAPATTINAM', gst_number: '', address: 'NORTH STREET, NAGAPATTINAM' },
  { name: 'VILLAGE FRESH FOODS', city: 'RAMANATHAPURAM', gst_number: '', address: 'NEHRU STREET, RAMANATHAPURAM' },
  { name: 'ORGANIC LIFE', city: 'RAMANATHAPURAM', gst_number: '', address: 'COLLECTOR OFFICE ROAD, RAMANATHAPURAM' },
  { name: 'HEALTH HOUSE', city: 'SIVAGANGA', gst_number: '', address: 'MAIN ROAD, SIVAGANGA' },
  { name: 'PURE FOODS', city: 'SIVAGANGA', gst_number: '', address: 'HOSPITAL ROAD, SIVAGANGA' },
  { name: 'GREEN ORGANICS', city: 'VIRUDHUNAGAR', gst_number: '', address: 'MADURAI ROAD, VIRUDHUNAGAR' },
  { name: 'NATURE FOODS', city: 'VIRUDHUNAGAR', gst_number: '', address: 'SRIVILLIPUTHUR ROAD, VIRUDHUNAGAR' },
  { name: 'ORGANIC CORNER', city: 'THENI', gst_number: '', address: 'PERIYAKULAM ROAD, THENI' },
  { name: 'FRESH BASKET', city: 'THENI', gst_number: '', address: 'CUMBUM ROAD, THENI' },
  
  // Row 81-90
  { name: 'NATURAL BASKET', city: 'THOOTHUKUDI', gst_number: '', address: 'VE ROAD, THOOTHUKUDI' },
  { name: 'ORGANIC HOME', city: 'THOOTHUKUDI', gst_number: '', address: 'PALAYAMKOTTAI ROAD, THOOTHUKUDI' },
  { name: 'HEALTH CORNER', city: 'NAGERCOIL', gst_number: '', address: 'COURT ROAD, NAGERCOIL' },
  { name: 'GREEN FRESH', city: 'NAGERCOIL', gst_number: '', address: 'DUTHIE SCHOOL ROAD, NAGERCOIL' },
  { name: 'ORGANIC DELIGHT', city: 'KANYAKUMARI', gst_number: '', address: 'BEACH ROAD, KANYAKUMARI' },
  { name: 'NATURE BASKET ORGANICS', city: 'OOTY', gst_number: '', address: 'COMMERCIAL ROAD, OOTY' },
  { name: 'HILL ORGANICS', city: 'OOTY', gst_number: '', address: 'CHARRING CROSS, OOTY' },
  { name: 'MOUNTAIN FRESH', city: 'KODAIKANAL', gst_number: '', address: 'ANNA SALAI, KODAIKANAL' },
  { name: 'ORGANIC HILLS', city: 'KODAIKANAL', gst_number: '', address: 'PT ROAD, KODAIKANAL' },
  { name: 'NATURE PURE', city: 'HOSUR', gst_number: '', address: 'BANGALORE ROAD, HOSUR' },
];

export const seedStores = async () => {
  console.log('Seeding stores...');

  await initDatabase();

  let insertedCount = 0;
  let skippedCount = 0;

  for (const store of stores) {
    // Check if store with same name already exists
    const existing = query(
      'SELECT id FROM stores WHERE name = ?',
      [store.name]
    );

    if (existing && existing.length > 0) {
      console.log(`Skipping existing store: ${store.name}`);
      skippedCount++;
      continue;
    }

    // Insert the store
    run(
      `INSERT INTO stores (name, address, city, state, gst_number, is_active) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [
        store.name,
        store.address,
        store.city,
        'Tamil Nadu',
        store.gst_number || null,
      ]
    );

    console.log(`Inserted: ${store.name} - ${store.city}`);
    insertedCount++;
  }

  saveDatabase();
  console.log(`\nSeeding completed!`);
  console.log(`Inserted: ${insertedCount} stores`);
  console.log(`Skipped: ${skippedCount} stores (already exist)`);
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedStores()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
