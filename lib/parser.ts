import type { Product, SpecRow } from '../data';

const aliases: Record<string,string> = {
 'brand name':'Brand Name','model name':'Model Name','style number':'Style Number','item type name':'Item Type Name','item weight':'Item Weight','country of origin':'Country Of Origin',
 'fitting type':'Fitting type','colour':'Colour','color':'Colour','style name':'Style Name','neck style':'Neck Style','sleeve type':'Sleeve Type','collar style':'Collar Style','pattern':'Pattern','season':'Season','apparel closure type':'Apparel Closure Type','cuff style':'Cuff Style','apparel occasion and lifestyle':'Apparel Occasion and Lifestyle','number of pockets':'Number Of Pockets','pocket description':'Pocket Description','sleeve length description':'Sleeve Length Description','material type':'Material type','fabric type':'Fabric Type','product care instructions':'Product Care Instructions','apparel fabric weight class':'Apparel Fabric Weight Class','apparel fabric stretch':'Apparel Fabric Stretch','fabric stretchability':'Fabric Stretchability','asin':'ASIN','customer reviews':'Customer Reviews','manufacturer part number':'Manufacturer Part Number','item length description':'Item Length Description','number-of-items':'number-of-items'
};
const key = (s:string)=>s.trim().replace(/^[-*#]+\s*/,'').replace(/\*+/g,'').replace(/\s+/g,' ').toLowerCase(); 
function categoryFor(text:string){const t=text.toLowerCase(); if(/shoe|sneaker|loafer|sandal|slipper|boot/.test(t)) return 'Shoes'; if(/watch|wallet|belt|bag|sunglass|accessor/.test(t)) return 'Accessories'; if(/women|woman|dress|kurti|saree|skirt/.test(t)) return "Women's Fashion"; return "Men's Shirts";}
function pick(rows:SpecRow[], ...names:string[]){const wanted=names.map(n=>key(n)); return rows.find(r=>wanted.includes(key(r.label)))?.value||'';}
export function parseAmazonSpec(text:string, affiliateUrl:string, image:string): Product {
 const rows:SpecRow[]=[]; const lines=text.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
 for(let i=0;i<lines.length;i++){
   const line=lines[i].replace(/^[-•]\s*/,'').trim();
   const pipe=line.split('|').map(s=>s.trim()).filter(Boolean);
   if(pipe.length>=2 && !/^-+$/.test(pipe[1])) { const label=pipe[0].replace(/^\*+|\*+$/g,'').trim(); const value=pipe.slice(1).join(' | ').replace(/^\*+|\*+$/g,'').trim(); if(label && value && key(label)!=='style') rows.push({label:aliases[key(label)]||label,value}); continue; }
   const m=line.match(/^\*{0,2}([^:]+?)\*{0,2}\s*[:\t]\s*(.+)$/); if(m){ const label=m[1].trim(); const value=m[2].trim(); if(label.length<70 && value.length) rows.push({label:aliases[key(label)]||label,value}); continue; }
 }
 const dedup=new Map<string,SpecRow>(); rows.forEach(r=>{const k=key(r.label); if(k!=='style' && !dedup.has(k)) dedup.set(k,r)}); const specs=[...dedup.values()];
 const brand=pick(specs,'Brand Name')||'FashionFind Pick'; const model=pick(specs,'Model Name','Style Number'); const color=pick(specs,'Colour'); const fit=pick(specs,'Fitting type'); const material=pick(specs,'Fabric Type','Material type'); const care=pick(specs,'Product Care Instructions'); const asin=pick(specs,'ASIN');
 const title=`${brand}${model?` ${model}`:''}${color?` — ${color}`:''}`.replace(/\s+/g,' ').trim();
 const short=[color&&`${color} colour`,fit&&fit.toLowerCase(),material&&`made with ${material.toLowerCase()}`,care&&`care: ${care.toLowerCase()}`].filter(Boolean).join(', ');
 const description=`A curated ${categoryFor(text).toLowerCase()} find from ${brand}. ${short ? `The product features ${short}.` : 'See the full specifications below for the details provided by the retailer.'}`;
 return {id:`${brand}-${model||asin||Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''), title, brand, category:categoryFor(`${title} ${text}`), price:'See latest price on Amazon', image, affiliateUrl, description, color, fit, style:pick(specs,'Style Name','Style Number'), neck:pick(specs,'Neck Style'), sleeve:pick(specs,'Sleeve Type','Sleeve Length Description'), pattern:pick(specs,'Pattern'), material, care, closure:pick(specs,'Apparel Closure Type'), country:pick(specs,'Country Of Origin'), asin, model, rank:pick(specs,'Best Sellers Rank'), pockets:pick(specs,'Number Of Pockets'), season:pick(specs,'Season'), occasion:pick(specs,'Apparel Occasion and Lifestyle'), specs, sourceText:text};
}
