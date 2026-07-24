const fs = require('fs');
const path = require('path');

const replacements = [
  { search: /RUAAD SMART SMART MACHINE TRADING LLC/g, replace: 'Smart Nexus FZE LLC' },
  { search: /رواد سمارت للأجهزة الذكية/g, replace: 'سمارت نيكسس' },
  { search: /Ruaad Smart/g, replace: 'Smart Nexus' },
  { search: /RuaadSmart/g, replace: 'SmartNexus' },
  { search: /Ruaad_Smart/g, replace: 'Smart_Nexus' },
  { search: /ruaad_smart/g, replace: 'smart_nexus' },
  { search: /ruaad_/g, replace: 'nexus_' },
  { search: /Saudi National Bank/g, replace: 'Wio Bank' },
  { search: /ABUDHABI COMML\.BANK/g, replace: 'Wio Bank' },
  { search: /SA7210000001400033305105/g, replace: 'AE590860000009974815140' },
  { search: /AE100351641005629371001/g, replace: 'AE590860000009974815140' },
  { search: /flex flex-col justify-between relative text-xs select-none/g, replace: 'flex flex-col gap-6 relative text-xs select-none' },
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === '.next' || file.endsWith('.png') || file.endsWith('.jpg')) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.json') || fullPath.endsWith('.md'))) {
      if (file === 'package-lock.json') continue;
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { search, replace } of replacements) {
        if (content.match(search)) {
          content = content.replace(search, replace);
          changed = true;
        }
      }
      
      // Specifically fix QuotationEditor.tsx for Bank BIC and Bank Address on Page 1 and 2
      if (fullPath.includes('QuotationEditor.tsx') && changed) {
        // Just replacing the block if it matches
        const searchBlock1 = '                <div className="flex w-full border-b border-zinc-150">\n' +
                             '                  <div className="w-[50%] p-1.5 border-r border-zinc-200">\n' +
                             '                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-0.5">Company Name</span>\n' +
                             '                    <span className="text-zinc-800 font-semibold text-[9px] leading-tight">{formValues.companyName || "Smart Nexus FZE LLC"}</span>\n' +
                             '                  </div>\n' +
                             '                  <div className="w-[50%] p-1.5">\n' +
                             '                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-0.5">Bank Name</span>\n' +
                             '                    <span className="text-zinc-800 font-semibold text-[9px] leading-tight">{formValues.bankName || "Wio Bank"}</span>\n' +
                             '                  </div>\n' +
                             '                </div>\n' +
                             '                <div className="flex w-full border-b border-zinc-150">\n' +
                             '                  <div className="w-[50%] p-1.5 border-r border-zinc-200">\n' +
                             '                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-0.5">Company Address</span>\n' +
                             '                    <span className="text-zinc-800 font-medium text-[9px] leading-tight">{formValues.companyAddress || "Abraj Al Mamzar , Block A F 106 , Al Mamzar , United Arab Emirates"}</span>\n' +
                             '                  </div>\n' +
                             '                  <div className="w-[50%] p-1.5">\n' +
                             '                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-0.5">IBAN</span>\n' +
                             '                    <span className="text-zinc-900 font-mono font-bold text-[9px] tracking-wider leading-tight">{formValues.bankIban || "AE590860000009974815140"}</span>\n' +
                             '                  </div>\n' +
                             '                </div>\n' +
                             '                <div className="flex w-full">\n' +
                             '                  <div className="w-[50%] p-1.5 border-r border-zinc-200">\n' +
                             '                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-0.5">Email</span>\n' +
                             '                    <a href={`mailto:${formValues.companyEmail || "info@support.ruaadalraqamia.com"}`} className="text-blue-600 font-semibold text-[9px] leading-tight">{formValues.companyEmail || "info@support.ruaadalraqamia.com"}</a>\n' +
                             '                  </div>\n' +
                             '                  <div className="w-[50%] p-1.5">\n' +
                             '                    &nbsp;\n' +
                             '                  </div>\n' +
                             '                </div>';
                
        const replaceBlock1 = '                <div className="flex w-full border-b border-zinc-150">\n' +
                              '                  <div className="w-[50%] p-1.5 border-r border-zinc-200">\n' +
                              '                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-0.5">Company Name</span>\n' +
                              '                    <span className="text-zinc-800 font-semibold text-[9px] leading-tight">{formValues.companyName || "Smart Nexus FZE LLC"}</span>\n' +
                              '                  </div>\n' +
                              '                  <div className="w-[50%] p-1.5">\n' +
                              '                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-0.5">Bank Name & BIC</span>\n' +
                              '                    <span className="text-zinc-800 font-semibold text-[9px] leading-tight">{formValues.bankName || "Wio Bank"} - {formValues.bankBic || "WIOBAEADXXX"}</span>\n' +
                              '                  </div>\n' +
                              '                </div>\n' +
                              '                <div className="flex w-full border-b border-zinc-150">\n' +
                              '                  <div className="w-[50%] p-1.5 border-r border-zinc-200">\n' +
                              '                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-0.5">Company Address</span>\n' +
                              '                    <span className="text-zinc-800 font-medium text-[9px] leading-tight">{formValues.companyAddress || "Abraj Al Mamzar , Block A F 106 , Al Mamzar , United Arab Emirates"}</span>\n' +
                              '                  </div>\n' +
                              '                  <div className="w-[50%] p-1.5">\n' +
                              '                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-0.5">IBAN</span>\n' +
                              '                    <span className="text-zinc-900 font-mono font-bold text-[9px] tracking-wider leading-tight">{formValues.bankIban || "AE590860000009974815140"}</span>\n' +
                              '                  </div>\n' +
                              '                </div>\n' +
                              '                <div className="flex w-full">\n' +
                              '                  <div className="w-[50%] p-1.5 border-r border-zinc-200">\n' +
                              '                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-0.5">Email</span>\n' +
                              '                    <a href={`mailto:${formValues.companyEmail || "info@support.ruaadalraqamia.com"}`} className="text-blue-600 font-semibold text-[9px] leading-tight">{formValues.companyEmail || "info@support.ruaadalraqamia.com"}</a>\n' +
                              '                  </div>\n' +
                              '                  <div className="w-[50%] p-1.5">\n' +
                              '                    <span className="font-bold text-zinc-400 block uppercase text-[8px] mb-0.5">Bank Address</span>\n' +
                              '                    <span className="text-zinc-800 font-medium text-[9px] leading-tight">{formValues.bankAddress || "Etihad Airways Centre 5th Floor, Abu Dhabi, UAE"}</span>\n' +
                              '                  </div>\n' +
                              '                </div>';
                
         content = content.split(searchBlock1).join(replaceBlock1);
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated: ' + fullPath);
      }
    }
  }
}

processDir('./src');
processDir('./public');
console.log('Done!');
