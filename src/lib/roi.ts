export type ROIOptions = {
    storeCount: number;
    monthlyRevenue: number; // In BRL
    employeesCount: number;
    leverage: 'low' | 'medium' | 'high';
};

export type ROIResult = {
    annualSavings: number;
    revenueIncrease: number;
    efficiencyScore: number; // 0-100
    grade: 'A' | 'B' | 'C' | 'D';
};

export function calculateROI(data: ROIOptions): ROIResult {
    const { storeCount, monthlyRevenue, employeesCount, leverage } = data;

    // Base efficiency score calculation
    let efficiencyScore = 50;

    // Adjust based on leverage (Low leverage means high potential for improvement)
    if (leverage === 'low') efficiencyScore -= 20;
    if (leverage === 'high') efficiencyScore += 20;

    // Adjust based on revenue per employee (simple heuristic)
    const revenuePerEmployee = monthlyRevenue / (employeesCount || 1);
    if (revenuePerEmployee > 50000) efficiencyScore += 10;
    if (revenuePerEmployee < 20000) efficiencyScore -= 10;

    // Clamp score
    efficiencyScore = Math.max(0, Math.min(100, efficiencyScore));

    // Calculate potential annual savings (assuming 10% operational efficiency gain)
    // If efficiency is low, potential savings are higher
    const inefficiencyFactor = (100 - efficiencyScore) / 100;
    const annualSavings = (monthlyRevenue * 12) * 0.05 * inefficiencyFactor;

    // Calculate potential revenue increase (assuming better lead management increases conversion)
    // More stores = more potential impact
    const baseGrowthRate = 0.15; // 15% growth
    const storeMultiplier = Math.log(storeCount + 1) * 0.5; // Diminishing returns but scales with stores
    const revenueIncrease = (monthlyRevenue * 12) * baseGrowthRate * Math.max(1, storeMultiplier);

    // Determine Grade based on Revenue and Potential
    let grade: ROIResult['grade'] = 'C';
    if (monthlyRevenue > 1000000 && storeCount > 5) grade = 'A';
    else if (monthlyRevenue > 300000) grade = 'B';
    else if (monthlyRevenue < 50000) grade = 'D';

    return {
        annualSavings: Math.round(annualSavings),
        revenueIncrease: Math.round(revenueIncrease),
        efficiencyScore: Math.round(efficiencyScore),
        grade
    };
}
