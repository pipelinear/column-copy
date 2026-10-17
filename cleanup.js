(() => {
  // Deliberately limited to common unambiguous misspellings. No guessed words,
  // network service, or replacement of unfamiliar names/technical vocabulary.
  const corrections = Object.freeze({
    teh: 'the', hte: 'the', thier: 'their', recieve: 'receive', recieved: 'received',
    recieves: 'receives', recieving: 'receiving', seperate: 'separate', seperated: 'separated',
    seperately: 'separately', definately: 'definitely', defintely: 'definitely',
    becuase: 'because', beacuse: 'because', becasue: 'because',
    goverment: 'government', governement: 'government', governmnet: 'government',
    occured: 'occurred', occuring: 'occurring', occurence: 'occurrence',
    acheive: 'achieve', acheived: 'achieved', acheivement: 'achievement',
    arguement: 'argument', arguements: 'arguments', enviroment: 'environment',
    developement: 'development', independance: 'independence',
    begining: 'beginning', belive: 'believe', beleive: 'believe',
    beleived: 'believed', beleives: 'believes', buisness: 'business',
    commitee: 'committee', comittee: 'committee', concious: 'conscious',
    conciousness: 'consciousness', exsistence: 'existence', existance: 'existence',
    foriegn: 'foreign', freind: 'friend', freinds: 'friends',
    gaurd: 'guard', gaurds: 'guards', harrass: 'harass',
    immdiately: 'immediately', imediately: 'immediately',
    knowlege: 'knowledge', langauge: 'language', langauges: 'languages',
    neccessary: 'necessary', necesary: 'necessary', occassion: 'occasion',
    oppurtunity: 'opportunity', oppurtunities: 'opportunities',
    priviledge: 'privilege', publically: 'publicly',
    refered: 'referred', refering: 'referring', relevent: 'relevant',
    religous: 'religious', responsibilty: 'responsibility',
    succesful: 'successful', sucessful: 'successful',
    succesfully: 'successfully', sucessfully: 'successfully',
    suprise: 'surprise', suprised: 'surprised',
    tendancy: 'tendency',
    tommorow: 'tomorrow', tommorrow: 'tomorrow',
    truely: 'truly', untill: 'until', usefull: 'useful',
    wierd: 'weird', writting: 'writing',
  });
  const ligatures = { 'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl' };
  function clean(blocks) {
    const changes = new Map();
    function fix(text, record) {
      return text.replace(/[\u00ad\u200b\ufeff]/g, '').replace(/[ﬀﬁﬂﬃﬄ]/g, c => ligatures[c])
        .replace(/\b[A-Za-z]+\b/g, word => {
          const replacement = Object.hasOwn(corrections, word.toLowerCase()) ? corrections[word.toLowerCase()] : undefined;
          if (!replacement) return word;
          // Mixed-case identifiers are not prose.
          if (word !== word.toLowerCase() && word !== word.toUpperCase() && word !== word[0].toUpperCase() + word.slice(1).toLowerCase()) return word;
          const corrected = word === word.toUpperCase() ? replacement.toUpperCase() :
            word[0] === word[0].toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
          if (record) {
            const key = `${word}\0${corrected}`;
            const change = changes.get(key) || { from: word, to: corrected, count: 0 };
            change.count++; changes.set(key, change);
          }
          return corrected;
        });
    }
    const cleaned = blocks.map(block => {
      if (block.tag === 'pre' || /<code[>\s]/i.test(block.html)) return { ...block };
      return { ...block, text: fix(block.text, true),
        html: block.html.split(/(<[^>]*>)/g).map(part => part.startsWith('<') ? part : fix(part, false)).join('') };
    });
    return { blocks: cleaned, changes: [...changes.values()] };
  }
  globalThis.columnCopyCleanup = clean;
})();
