
class ParsedResults 
{
  contracts: number;
  totals: Map<number, number>;
  nonAllianceName: Set<string>;
  nonAllianceContracts: number;
  name: string;

  constructor(name: string = "") {
    this.name = name;
    this.contracts = 0;
    this.totals = new Map();
    this.nonAllianceContracts = 0;
    this.nonAllianceName = new Set();
  }

  add(other: ParsedResults)
  {
    this.contracts += other.contracts;
    this.nonAllianceContracts += other.contracts;
    

    // Union set
    for (let allianceName of other.nonAllianceName)
    {
      this.nonAllianceName.add(allianceName);
    }

    // Merge totals maps.
    for (let [key, value] of other.totals)
    {
      if (this.totals.has(key))
      {
        this.totals.set(key, this.totals.get(key) + value);
      }
      else
      {
        this.totals.set(key, value);
      }
    }
  }
}


interface ItemData {
  type_id: number;
  quantity: number;
}

interface ContractData {
  readonly details: Array<ItemData>;
}