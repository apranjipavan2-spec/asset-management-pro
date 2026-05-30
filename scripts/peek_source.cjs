'use strict';
const ExcelJS = require('exceljs');
const FILE = 'C:/Users/apran/Downloads/RE_ Asset data- final/Dep. Asset Register 25-26-05052026.xlsx';
function cellText(v){if(v==null)return'';if(typeof v==='string')return v.trim();if(typeof v==='number')return String(v);if(v instanceof Date)return v.toISOString().slice(0,10);if(typeof v==='object'){if('richText'in v)return v.richText.map(t=>t.text).join('').trim();if('result'in v)return String(v.result??'').trim();if('text'in v)return String(v.text).trim();}return String(v).trim();}
(async()=>{
  const wb=new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  let n=0;
  for(const ws of wb.worksheets){
    if(n++>2)break;
    console.log(`-- Sheet: ${ws.name} rows=${ws.rowCount} cols=${ws.columnCount}`);
    for(let r=1;r<=Math.min(ws.rowCount,5);r++){
      const row=ws.getRow(r);
      const v=[];
      for(let c=1;c<=Math.min(ws.columnCount,20);c++) v.push(`[${c}]`+cellText(row.getCell(c).value));
      console.log(`R${r}: `+v.join(' | '));
    }
  }
})();
