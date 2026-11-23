import { extractSalesFromRows, detectColumns } from '../../assets/js/posSalesParser.js';
import assert from 'node:assert/strict';
const kiot=[['BÁO CÁO BÁN HÀNG THEO HÀNG HÓA'],['Từ ngày 23/11/2026'],[],['Mã hàng','Tên hàng','Số lượng','Doanh thu'],['SP01','Sườn bò ướp','12','3.600.000'],['SP02','Cơm trắng',30,'300.000'],['SP01','Sườn bò ướp','3','900.000'],['','Tổng cộng','45','4.800.000']];
const r=extractSalesFromRows(kiot);assert.equal(r.ok,true);assert.deepEqual(r.sales,[{name:'Sườn bò ướp',qty:15},{name:'Cơm trắng',qty:30}]);
const ko=[['메뉴','판매수량'],['양념갈비','1,204'],['냉면','0']];assert.deepEqual(extractSalesFromRows(ko).sales,[{name:'양념갈비',qty:1204}]);
assert.equal(detectColumns([['a','b'],['1','2']]),null);
console.log('parser ok');
import { parseCsv, toCsv, buildTemplateRows, buildSampleRows } from '../../assets/js/posSalesParser.js';
// 양식 → CSV → 다시 읽기
const tpl = buildTemplateRows(['양념갈비', 'Cơm, trộn']); tpl[1][1] = 5; tpl[2][1] = '2';
const back = parseCsv(toCsv(tpl));
assert.deepEqual(extractSalesFromRows(back).sales, [{ name: '양념갈비', qty: 5 }, { name: 'Cơm, trộn', qty: 2 }]);
// 세미콜론 구분 (베트남 엑셀)
assert.deepEqual(extractSalesFromRows(parseCsv('Tên món;SL\r\nPhở bò;7\r\nTổng;7\r\n')).sales, [{ name: 'Phở bò', qty: 7 }]);
// 샘플 파일: 합계 줄 빠지고 메뉴만
const sample = extractSalesFromRows(parseCsv(toCsv(buildSampleRows(['A', 'B']))));
assert.deepEqual(sample.sales, [{ name: 'A', qty: 2 }, { name: 'B', qty: 3 }]);
console.log('csv ok');
