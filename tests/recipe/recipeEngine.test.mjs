import { planDeduction, cleanRecipeItems, findRecipe, makeSourceKey, matchSuggestedRecipe, normalizeName } from '../../assets/js/recipeEngine.js';
import assert from 'node:assert/strict';
const materials=[{id:'beef',name:'소갈비',unit:'kg',stock:10},{id:'sauce',name:'갈비 양념',unit:'L',stock:3},{id:'rice',name:'쌀',unit:'kg',stock:20}];
const recipes=[{productId:'p1',productName:'양념갈비 1인분',items:[{materialId:'beef',qty:0.25},{materialId:'sauce',qty:0.05}]},
 {productId:'p2',productName:'공기밥',aliases:['Cơm trắng'],items:[{materialId:'rice',qty:0.2},{materialId:'',qty:1}]}];
let n=0;const t=(name,f)=>{f();n++;console.log('ok',name)};
t('plan sums by material',()=>{const p=planDeduction([{name:'양념갈비 1인분',qty:4},{productId:'p1',qty:2},{name:'cơm trắng',qty:5},{name:'김치찌개',qty:3}],recipes,materials);
 const beef=p.lines.find(l=>l.materialId==='beef');assert.equal(beef.qty,1.5);assert.equal(beef.stockAfter,8.5);
 assert.equal(p.lines.find(l=>l.materialId==='sauce').qty,0.3);assert.equal(p.lines.find(l=>l.materialId==='rice').qty,1);
 assert.deepEqual(p.unmatched,[{name:'김치찌개',qty:3}]);assert.equal(p.matched.length,3);});
t('zero/negative qty ignored',()=>{const p=planDeduction([{name:'공기밥',qty:0},{name:'공기밥',qty:-2}],recipes,materials);assert.equal(p.lines.length,0);});
t('missing material flagged',()=>{const p=planDeduction([{productId:'x',name:'X',qty:1}],[{productId:'x',productName:'X',items:[{materialId:'gone',qty:1}]}],materials);assert.equal(p.lines[0].missing,true);});
t('clean drops empty rows',()=>assert.equal(cleanRecipeItems([{materialId:'a',qty:'0.5'},{materialId:'',qty:1},{materialId:'b',qty:0}]).length,1));
t('name normalize spaces',()=>assert.equal(normalizeName('양념 갈비(1인분)'),normalizeName('양념갈비1인분')));
t('source key safe',()=>assert.match(makeSourceKey('pos','2026-11-23 #1/a'),/^[A-Za-z0-9_\-]+$/));
t('ai suggestion matching',()=>{const r=matchSuggestedRecipe([{name:'소갈비',qty:0.25,unit:'kg'},{name:'양념',qty:0.05},{name:'참기름',qty:0.01}],materials);assert.equal(r.items.length,2);assert.equal(r.suggestedNew[0].name,'참기름');});
console.log(n,'passed');
