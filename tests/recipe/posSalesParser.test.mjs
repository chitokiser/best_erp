import { extractSalesFromRows, detectColumns } from '../../assets/js/posSalesParser.js';
import assert from 'node:assert/strict';
const kiot=[['BÁO CÁO BÁN HÀNG THEO HÀNG HÓA'],['Từ ngày 23/11/2026'],[],['Mã hàng','Tên hàng','Số lượng','Doanh thu'],['SP01','Sườn bò ướp','12','3.600.000'],['SP02','Cơm trắng',30,'300.000'],['SP01','Sườn bò ướp','3','900.000'],['','Tổng cộng','45','4.800.000']];
const r=extractSalesFromRows(kiot);assert.equal(r.ok,true);assert.deepEqual(r.sales,[{name:'Sườn bò ướp',qty:15},{name:'Cơm trắng',qty:30}]);
const ko=[['메뉴','판매수량'],['양념갈비','1,204'],['냉면','0']];assert.deepEqual(extractSalesFromRows(ko).sales,[{name:'양념갈비',qty:1204}]);
assert.equal(detectColumns([['a','b'],['1','2']]),null);
console.log('parser ok');
