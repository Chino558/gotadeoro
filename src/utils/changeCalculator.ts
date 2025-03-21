interface ChangeBreakdown {
  [denomination: number]: number;
}

export interface ChangeResult {
  total: number;
  breakdown: ChangeBreakdown;
  isValid: boolean;
  message?: string;
}

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export function calculateChange(billAmount: number, paymentAmount: number): ChangeResult {
  // Validate payment
  if (paymentAmount < billAmount) {
    return {
      total: 0,
      breakdown: {},
      isValid: false,
      message: "Pago insuficiente"
    };
  }

  const changeAmount = paymentAmount - billAmount;
  const breakdown: ChangeBreakdown = {};
  let remainingChange = changeAmount;

  // Calculate breakdown
  DENOMINATIONS.forEach(denomination => {
    if (remainingChange >= denomination) {
      const count = Math.floor(remainingChange / denomination);
      breakdown[denomination] = count;
      remainingChange -= count * denomination;
    }
  });

  return {
    total: changeAmount,
    breakdown,
    isValid: true
  };
}

export function suggestPaymentAmount(billAmount: number): number[] {
  const suggestions: number[] = [];
  
  // Round up to nearest 10
  const roundedToTen = Math.ceil(billAmount / 10) * 10;
  if (roundedToTen > billAmount) {
    suggestions.push(roundedToTen);
  }

  // Round up to nearest 50
  const roundedToFifty = Math.ceil(billAmount / 50) * 50;
  if (roundedToFifty > billAmount && roundedToFifty !== roundedToTen) {
    suggestions.push(roundedToFifty);
  }

  // Round up to nearest 100
  const roundedToHundred = Math.ceil(billAmount / 100) * 100;
  if (roundedToHundred > billAmount && roundedToHundred !== roundedToFifty) {
    suggestions.push(roundedToHundred);
  }

  // Add standard larger bills
  const standardBills = [200, 500, 1000];
  standardBills.forEach(bill => {
    if (bill > billAmount && !suggestions.includes(bill)) {
      suggestions.push(bill);
    }
  });

  // Limit to 4 suggestions maximum
  return suggestions.slice(0, 4);
}
