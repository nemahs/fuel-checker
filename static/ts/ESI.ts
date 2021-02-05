
class ParsedResults 
{
  contracts: number;
  totals: Map<number, number>;
  nonAllianceName: Set<string>;
  nonAllianceContracts: number;

  constructor() {
    this.contracts = 0;
    this.totals = new Map();
    this.nonAllianceContracts = 0;
    this.nonAllianceName = new Set();
  }
}


interface ItemData {
  type_id: number;
  quantity: number;
}

interface ContractData {
  readonly details: Array<ItemData>;
}