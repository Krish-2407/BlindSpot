export function transliterateDevanagari(text) {
  if (!text) return '';
  
  const map = {
    // Vowels (Independent)
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
    
    // Matras (Dependent Vowels)
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ः': 'h', 'ँ': 'n',
    
    // Consonants
    'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
    'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
    'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
    'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
    'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
    'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha', 'ष': 'sha', 'स': 'sa', 'ह': 'ha',
    'क्ष': 'ksha', 'त्र': 'tra', 'ज्ञ': 'gya', 'ड़': 'd', 'ढ़': 'dh', 'ज़': 'z', 'फ़': 'f', 'ख़': 'kh', 'ग़': 'g',
    
    // Numbers
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1] || '';
    
    let mapped = map[char];
    
    if (mapped) {
      const isConsonant = 'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहक्षत्रज्ञड़ढ़ज़फ़ख़ग़'.includes(char);
      const isNextMatra = 'ािीुूृेैोौंःँ्'.includes(nextChar);
      const isNextSeparator = !nextChar || ' \t\n\r.,!?-()[]{}""\'\''.includes(nextChar);
      
      if (isConsonant) {
        if (isNextMatra) {
          if (nextChar === '्') {
            result += mapped.slice(0, -1);
            i++; 
            continue;
          } else {
            result += mapped.slice(0, -1) + map[nextChar];
            i++; 
            continue;
          }
        }
        if (isNextSeparator) {
          result += mapped.slice(0, -1);
          continue;
        }
      }
      result += mapped;
    } else {
      result += char;
    }
  }
  
  return result
    .replace(/aa+/g, 'a')
    .replace(/ee+/g, 'ee')
    .replace(/oo+/g, 'oo')
    .replace(/ae/g, 'e');
}
