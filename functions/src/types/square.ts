export interface SquareOrderEntry {
  orderId: string;
  locationId: string;
  version?: number;
}

export interface SquareSearchResponse {
  orders?: SquareOrder[];
  cursor?: string;
}

export interface SquareMoneyAmount {
  amount: bigint;
  currency: string;
}

export interface SquareAppliedTax {
  uid: string;
  taxUid: string;
  appliedMoney: SquareMoneyAmount;
  autoApplied: boolean;
}

export interface SquareModifier {
  uid: string;
  basePriceMoney: SquareMoneyAmount;
  totalPriceMoney: SquareMoneyAmount;
  name: string;
  catalogObjectId: string;
  catalogVersion: number | bigint;
  quantity: string;
}

export interface SquareLineItem {
  uid: string;
  catalogObjectId: string;
  catalogVersion: number | bigint;
  quantity: string;
  name: string;
  variationName: string;
  basePriceMoney: SquareMoneyAmount;
  modifiers?: SquareModifier[];
  grossSalesMoney: SquareMoneyAmount;
  totalTaxMoney: SquareMoneyAmount;
  totalDiscountMoney: SquareMoneyAmount;
  totalMoney: SquareMoneyAmount;
  variationTotalPriceMoney: SquareMoneyAmount;
  appliedTaxes?: SquareAppliedTax[];
  itemType: string;
  totalServiceChargeMoney: SquareMoneyAmount;
  note?: string;
}

export interface SquareTax {
  uid: string;
  catalogObjectId: string;
  catalogVersion: number;
  name: string;
  percentage: string;
  type: string;
  appliedMoney: SquareMoneyAmount;
  scope: string;
}

export interface SquareNetAmounts {
  totalMoney: SquareMoneyAmount;
  taxMoney: SquareMoneyAmount;
  discountMoney: SquareMoneyAmount;
  tipMoney: SquareMoneyAmount;
  serviceChargeMoney: SquareMoneyAmount;
}

export interface SquareOrder {
  id: string;
  locationId: string;
  lineItems: SquareLineItem[];
  taxes?: SquareTax[];
  createdAt: string;
  updatedAt: string;
  state: string;
  totalTaxMoney: SquareMoneyAmount;
  totalDiscountMoney: SquareMoneyAmount;
  totalTipMoney: SquareMoneyAmount;
  totalMoney: SquareMoneyAmount;
  closedAt?: string;
  netAmounts: {
    totalMoney: SquareMoneyAmount;
    taxMoney: SquareMoneyAmount;
    discountMoney: SquareMoneyAmount;
    tipMoney: SquareMoneyAmount;
    serviceChargeMoney: SquareMoneyAmount;
  };
  source: {
    name?: string;
  };
  ticketName?: string;
}

export interface SquareBatchResponse {
  orders?: SquareOrder[];
  errors?: Array<{
    category: string;
    code: string;
    detail: string;
  }>;
}
