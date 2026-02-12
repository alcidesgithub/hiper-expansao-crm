import { calculateROI, ROIOptions } from '../src/lib/roi';

const inputs: ROIOptions[] = [
    { storeCount: 1, monthlyRevenue: 40000, employeesCount: 4, leverage: 'low' },
    { storeCount: 10, monthlyRevenue: 1500000, employeesCount: 50, leverage: 'medium' },
    { storeCount: 50, monthlyRevenue: 8000000, employeesCount: 200, leverage: 'high' },
];

inputs.forEach(input => {
    console.log('Input:', input);
    console.log('Result:', calculateROI(input));
    console.log('---');
});
