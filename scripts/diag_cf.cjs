'use strict';
const ExcelJS = require('exceljs');
const path = require('path');
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];
  const cf = ws.conditionalFormattings || [];
  console.log(`Conditional formatting rules: ${cf.length}`);
  for (let i = 0; i < cf.length; i++) {
    console.log(`\n[${i}] ref=${cf[i].ref || 'n/a'}`);
    const rules = cf[i].rules || [];
    console.log(`    rules: ${rules.length}`);
    for (let j = 0; j < rules.length; j++) {
      const r = rules[j];
      console.log(`      [${j}] type=${r.type} priority=${r.priority} operator=${r.operator || ''}`);
      if (r.formulae) console.log(`           formulae: ${JSON.stringify(r.formulae)}`);
      if (r.style) console.log(`           style: ${JSON.stringify(r.style).slice(0, 120)}`);
    }
  }
})();
