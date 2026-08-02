const fs = require('fs');

let content = fs.readFileSync('london-underground-timetable/public/index.html', 'utf8');

const regex1 = /<<<<<<< HEAD[\s\S]*?=======\n(          stationMap\.setView\(\[lat, lon\], 15\);[\s\S]*?)>>>>>>> jules-15455342486389620282-312b893b/g;
content = content.replace(regex1, '$1');

const regex2 = /<<<<<<< HEAD[\s\S]*?=======\n(          \}\)\.addTo\(stationMap\)\.bindPopup\(popupContent\)\.openPopup\(\);)\n>>>>>>> jules-15455342486389620282-312b893b/g;
content = content.replace(regex2, '$1');

fs.writeFileSync('london-underground-timetable/public/index.html', content);
