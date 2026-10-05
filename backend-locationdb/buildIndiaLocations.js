/**
 * buildIndiaLocations.js
 *
 * Converts the GeoNames India dataset into the format
 * currently used by StormSense.
 *
 * Required files inside:
 * backend-locationdb/data/
 *
 *   IN.txt
 *   admin1CodesASCII.txt
 *   admin2Codes.txt
 *
 * Output:
 *   backend-locationdb/data/assamLocations.js
 *
 * The output filename is intentionally kept as
 * "assamLocations.js" so your existing seedDatabase.js
 * can continue working without changing its import.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

const INPUT_FILE = path.join(DATA_DIR, 'IN.txt');
const ADMIN1_FILE = path.join(DATA_DIR, 'admin1CodesASCII.txt');
const ADMIN2_FILE = path.join(DATA_DIR, 'admin2Codes.txt');

const OUTPUT_FILE = path.join(DATA_DIR, 'assamLocations.js');


/* -------------------------------------------
   Helper: read a text file line-by-line
------------------------------------------- */

function readLines(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);
}


/* -------------------------------------------
   Load Indian state names
------------------------------------------- */

function loadAdmin1() {
  const map = new Map();

  const lines = readLines(ADMIN1_FILE);

  for (const line of lines) {

    const parts = line.split('\t');

    if (parts.length < 2) continue;

    const code = parts[0];
    const name = parts[1];

    // Example:
    // IN.03    Assam
    // IN.10    Bihar

    if (code.startsWith('IN.')) {
      map.set(code, name);
    }
  }

  return map;
}


/* -------------------------------------------
   Load Indian district names
------------------------------------------- */

function loadAdmin2() {
  const map = new Map();

  const lines = readLines(ADMIN2_FILE);

  for (const line of lines) {

    const parts = line.split('\t');

    if (parts.length < 2) continue;

    const code = parts[0];
    const name = parts[1];

    // Example:
    // IN.03.001    Baksa

    if (code.startsWith('IN.')) {
      map.set(code, name);
    }
  }

  return map;
}


/* -------------------------------------------
   Check required files
------------------------------------------- */

if (!fs.existsSync(INPUT_FILE)) {

  console.error('');
  console.error('ERROR: IN.txt was not found.');
  console.error('');
  console.error('Expected location:');
  console.error(INPUT_FILE);
  console.error('');

  process.exit(1);
}


if (!fs.existsSync(ADMIN1_FILE)) {

  console.error('');
  console.error('ERROR: admin1CodesASCII.txt was not found.');
  console.error('');
  console.error('Expected location:');
  console.error(ADMIN1_FILE);
  console.error('');

  process.exit(1);
}


if (!fs.existsSync(ADMIN2_FILE)) {

  console.error('');
  console.error('ERROR: admin2Codes.txt was not found.');
  console.error('');
  console.error('Expected location:');
  console.error(ADMIN2_FILE);
  console.error('');

  process.exit(1);
}


/* -------------------------------------------
   Load administrative data
------------------------------------------- */

console.log('');
console.log('Loading Indian state and district data...');

const admin1 = loadAdmin1();
const admin2 = loadAdmin2();

console.log(`States loaded: ${admin1.size}`);
console.log(`District codes loaded: ${admin2.size}`);


/* -------------------------------------------
   Process GeoNames India file
------------------------------------------- */

console.log('');
console.log('Reading IN.txt...');
console.log('This may take a little while.');
console.log('');

const lines = readLines(INPUT_FILE);

const locations = [];

const seen = new Set();


/*
GeoNames columns:

0  geonameid
1  name
2  asciiname
3  alternatenames
4  latitude
5  longitude
6  feature class
7  feature code
8  country code
9  cc2
10 admin1 code
11 admin2 code
12 admin3 code
13 admin4 code
14 population
15 elevation
16 gtopo30
17 timezone
18 modification date
*/


for (const line of lines) {

  const parts = line.split('\t');

  if (parts.length < 19) {
    continue;
  }


  const geonameId = parts[0];
  const name = parts[1];

  const latitude = parts[4];
  const longitude = parts[5];

  const featureClass = parts[6];
  const featureCode = parts[7];

  const countryCode = parts[8];

  const admin1Code = parts[10];
  const admin2Code = parts[11];


  /*
   Only keep populated places.

   GeoNames:
   Feature class P = populated place
  */

  if (countryCode !== 'IN') {
    continue;
  }

  if (featureClass !== 'P') {
    continue;
  }


  const lat = Number(latitude);
  const lon = Number(longitude);


  if (!name) {
    continue;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    continue;
  }


  /* -----------------------------------------
     Find state
  ----------------------------------------- */

  const stateKey = `IN.${admin1Code}`;

  const state =
    admin1.get(stateKey) ||
    admin1Code;


  /* -----------------------------------------
     Find district
  ----------------------------------------- */

  const districtKey =
    `IN.${admin1Code}.${admin2Code}`;

  const district =
    admin2.get(districtKey) ||
    admin2Code;


  if (!state || !district) {
    continue;
  }


  /*
   Prevent duplicate records.
  */

  const uniqueKey =
    `${state}|${district}|${name}|${lat}|${lon}`;


  if (seen.has(uniqueKey)) {
    continue;
  }

  seen.add(uniqueKey);


  /* -----------------------------------------
     Determine location level
  ----------------------------------------- */

  let level = 'locality';


  /*
   PPLA2/PPLA3/PPLA4 represent administrative
   seats at lower administrative levels.
  */

  if (
    featureCode === 'PPLA2' ||
    featureCode === 'PPLA3' ||
    featureCode === 'PPLA4'
  ) {
    level = 'district';
  }


  /* -----------------------------------------
     Create StormSense record
  ----------------------------------------- */

  locations.push({

    locationId: `IN-GN-${geonameId}`,

    country: 'India',

    state: state,

    district: district,

    cityOrArea: name,

    level: level,

    latitude: lat,

    longitude: lon

  });

}


/* -------------------------------------------
   Sort locations
------------------------------------------- */

locations.sort((a, b) => {

  const stateCompare =
    a.state.localeCompare(b.state);

  if (stateCompare !== 0) {
    return stateCompare;
  }


  const districtCompare =
    a.district.localeCompare(b.district);

  if (districtCompare !== 0) {
    return districtCompare;
  }


  return a.cityOrArea.localeCompare(
    b.cityOrArea
  );

});


/* -------------------------------------------
   Generate JavaScript file
------------------------------------------- */

const outputContent = `/**
 * Nationwide India location data.
 *
 * Generated automatically from GeoNames.
 *
 * Contains:
 * State
 * District
 * Locality
 * Latitude
 * Longitude
 */

const indiaLocations = ${JSON.stringify(
  locations,
  null,
  2
)};

module.exports = indiaLocations;
`;


/* -------------------------------------------
   Write output file
------------------------------------------- */

fs.writeFileSync(
  OUTPUT_FILE,
  outputContent,
  'utf8'
);


/* -------------------------------------------
   Statistics
------------------------------------------- */

const states = new Set();

const districts = new Set();


for (const location of locations) {

  states.add(location.state);

  districts.add(
    `${location.state}|${location.district}`
  );

}


/* -------------------------------------------
   Done
------------------------------------------- */

console.log('');
console.log('==============================================');
console.log(' StormSense India Location Conversion Complete');
console.log('==============================================');

console.log('');

console.log(
  `Locations : ${locations.length}`
);

console.log(
  `States    : ${states.size}`
);

console.log(
  `Districts : ${districts.size}`
);

console.log('');

console.log(
  `Output file: ${OUTPUT_FILE}`
);

console.log('');

console.log('You can now run:');

console.log(
  'node .\\scripts\\seedDatabase.js'
);

console.log('');