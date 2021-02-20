class StructureData extends HTMLElement
{
  private static get StructureTemplate() : HTMLTemplateElement { return document.querySelector("#structure-template"); }

  populateData(data: ParsedResults)
  {
    this.overview.textContent = `${data.contracts} contracts:  ${this.structureName}`;

    if (structureOpen.get(this.structureName))
    {
      this.details.classList.add("show");
    }

    populateTotals(this.details, data);
    populateNonAllianceContracts(this.details, data);
  }

  get details(): HTMLElement      { return this.querySelector(".structureDetails"); }
  get overview(): HTMLElement     { return this.querySelector(".structureOverview"); }
  get structureName(): string     { return this.details.getAttribute("structure"); }
  set structureName(name: string) { this.details.setAttribute("structure", name); }
  get isShown(): boolean          { return this.details.classList.contains("show"); }


  constructor(name: string, data?: ParsedResults) { 
    super();
    this.append(StructureData.StructureTemplate.content.cloneNode(true)); 
    this.structureName = name;

    if (data)
    {
      this.populateData(data);
    }
  }
}

customElements.define('structure-data', StructureData);


declare var userSystems: Array<string>;
let savedContractTotal: number = 0;

const filteredItems: Map<number, string> = new Map( 
[
  [17888, "Nitrogen Isotopes"],
  [17887, "Oxygen Isotopes"],
  [17889, "Hydrogen Isotopes"],
  [16274, "Helium Isotopes"],
  [16275, "Stront"],
  [41489, "Cap Booster 3200s"],
]);

const structureOpen: Map<string, boolean> = new Map();

const GOON_ALLIANCE_ID: number = 1354830081;
const ORIGINAL_TITLE: string = document.title;


function getSystemNode(systemName: string): HTMLElement
{
  const systemList: HTMLElement = document.querySelector("#system-list");
  return systemList.querySelector("#system-" + systemName);
}


function createSystemInfo(systemName: string): HTMLElement
{
  const systemTemplate: HTMLTemplateElement = document.querySelector("#system-template");
  const systemList: HTMLElement = document.querySelector("#system-list");


  if (getSystemNode(systemName) !== null || systemName === "")
  {
    console.warn("Current node already exists");
    return;
  }

  // Create new list entry and add to the list.
  const newTemplate: HTMLElement = systemTemplate.content.firstElementChild.cloneNode(true) as HTMLElement;
  newTemplate.id = `system-${systemName}`;
  console.log(newTemplate);
  newTemplate.querySelector(".system-title").textContent = systemName;
  systemList.appendChild(newTemplate);
  Utils.enableNode(newTemplate);

  if (!userSystems.includes(systemName))
  {
    fetch(`/systems/add/${systemName}`).then(
      function () { loadData(systemName) }
    ).catch(
      function() { console.error("Bad response from server.") });
  }
}

function removeSystem(systemName: string)
{
  fetch(`/systems/remove/${systemName}`).then(function () {
    getSystemNode(systemName).remove();
  });
}

function populateList()
{
  if (typeof userSystems === 'undefined')
  {
    console.warn("User has no defined system list.");
    return;
  }

  let filteredSystems = userSystems.filter(system => system != "");

  filteredSystems.forEach(createSystemInfo);

  Promise.all(filteredSystems.map(system => loadData(system))).then((values) => {
    const totalContracts: number = values.reduce((acc, x) => acc + x.contracts, 0);

    if (totalContracts > 0)
    {
      console.log(`${totalContracts} available to fill, setting title.`);
      document.title = `(${totalContracts}) ${ORIGINAL_TITLE}`;


      const newContracts: number = totalContracts - savedContractTotal;
      if (newContracts > 0)
      {
        let notificationMessage: string = `${newContracts} new contract(s) since last update`;
        values.forEach(function(results: ParsedResults) {
            notificationMessage += `\n${results.contracts} currently in ${results.name}`;
        });

        Utils.notifyUser(notificationMessage);
      }

      savedContractTotal = totalContracts;
    }
    else
    {
      console.log("No contracts at the moment, setting normal title.");
      document.title = ORIGINAL_TITLE;
    }
  });
}

async function loadData(system: string): Promise<ParsedResults>
{
  if (system === "")
  {
    return;
  }


  const systemForm = getSystemNode(system);

  const response = await fetch(`/contracts/${system}`);
  const responseData = await response.json();

  const data: Map<string, ParsedResults> = parseData(responseData);
  console.log(data);
  const totalContracts: number = Array.from(data.values()).reduce((acc, val) => acc + val.contracts, 0);
  systemForm.querySelector(".contract-number").textContent = String(totalContracts);

  systemForm.querySelectorAll("structure-data").forEach(function (structure: StructureData) {
    structureOpen.set(structure.structureName, structure.isShown);
    structure.remove();
  });

  const systemResults: ParsedResults = new ParsedResults(system);

  data.forEach(function (structureData: ParsedResults, structureName: string) {
    var structureEntry = new StructureData(structureName, structureData);
    structureEntry.id = structureName;

    systemForm.querySelector(".system-list").appendChild(structureEntry);
    Utils.enableNode(structureEntry);
    systemResults.add(structureData);
  });


  Utils.disableNode(systemForm.querySelector(".loading-text"));
  systemForm.querySelectorAll(".contract-data").forEach(Utils.enableNode);

  return systemResults;
}

function populateTotals(systemForm: HTMLElement, data: ParsedResults)
{
  const totalsRoot: HTMLElement = systemForm.querySelector(".totals");

  Utils.removeAllChildNodes(totalsRoot);
  for (const [key, value] of data.totals)
  {
    var totalNode = document.createElement('li');
    totalNode.classList.add(filteredItems.get(key).split(' ')[0]);
    totalNode.classList.add("list-group-item");
    totalNode.classList.add("bg-secondary");
    totalNode.appendChild(document.createTextNode(`${filteredItems.get(key)}: ${Utils.formatNumber(value)}`));
    totalsRoot.appendChild(totalNode);
  }
}

function populateNonAllianceContracts(systemForm: HTMLElement, data: ParsedResults)
{
  const nonAllianceNode: HTMLElement = systemForm.querySelector(".nonAllianceContracts");

  if (data.nonAllianceContracts > 0)
  {
    nonAllianceNode.querySelector(".nonAllianceNumber").textContent = String(data.nonAllianceContracts);
    Utils.removeAllChildNodes(nonAllianceNode.querySelector(".nameList"));
    for (const issuerName of data.nonAllianceName)
    {
      var nameNode: HTMLElement = document.createElement("li");
      nameNode.appendChild(document.createTextNode(`${issuerName}`));
      nonAllianceNode.querySelector(".nameList").appendChild(nameNode);
    }

    Utils.enableNode(nonAllianceNode);
  }
  else
  {
    Utils.disableNode(nonAllianceNode);
  }
}

function countItem(itemID: number, data: ContractData, result: ParsedResults): boolean
{
  var success: boolean = false;

  for (let item of data.details)
  {
    if (item.type_id === itemID)
    {
      if (!result.totals.has(itemID))
      {
        result.totals.set(itemID, 0);
      }

      result.totals.set(itemID, result.totals.get(itemID) + item.quantity);
      success = true;
    }
  }

  return success;
}

function parseData(htmlResponse: any): Map<string, ParsedResults>
{
  var testResult: Map<string, ParsedResults> = new Map();

  console.log(htmlResponse);
  for (const contract of htmlResponse)
  {
    let success: boolean = false;
    let createdResult: boolean = false;
    // TODO: Refactor this, it's terrible.

    if (!testResult.has(contract.structureName))
    {
      testResult.set(contract.structureName, new ParsedResults());
      createdResult = true;
    }

    var structureResult: ParsedResults = testResult.get(contract.structureName);
    

    for (const item of filteredItems.keys())
    {
      success ||= countItem(+item, contract, structureResult);
    }

    if (success)
    {
      // Filter out non-alliance contracts
      if (contract.alliance_id !== GOON_ALLIANCE_ID)
      {
        ++structureResult.nonAllianceContracts;
        structureResult.nonAllianceName.add(contract.issuer_name);
        continue;
      }
      console.log(contract);
      ++structureResult.contracts;
    }
    else if (createdResult)
    {
      testResult.delete(contract.structureName);
    }
  }

  return testResult;
}

const REFRESH_INTERVAL_SECONDS: number = 120;
var timeToRefresh: number = REFRESH_INTERVAL_SECONDS;
function timerFunc(): void
{
  const timerDisplay: HTMLElement = document.querySelector("#timerValue");
  timeToRefresh--;

  if (timeToRefresh <= 0)
  {
    populateList();
    timeToRefresh = REFRESH_INTERVAL_SECONDS;
  }

  timerDisplay.textContent = Utils.formatTime(timeToRefresh);
}

document.addEventListener("DOMContentLoaded", () => {
  const addSystemForm = document.querySelector("#add-system-form");
  userSystems = userSystems.filter(system => system !== "");

  addSystemForm.addEventListener('submit', (event) => {
    createSystemInfo(event.target[0].value);
    addSystemForm.querySelector("input").value = "";
    event.stopImmediatePropagation();
    event.preventDefault();
  });


  const closeModal = document.querySelector("#closeModal");
  closeModal.addEventListener("show.bs.modal", function(event: any) {
    const systemName: string = Utils.queryNeighbor(event.relatedTarget, ".system-title").textContent;

    closeModal.querySelector("#removeSystemName").textContent = systemName;
    (closeModal.querySelector(".btn-primary") as HTMLInputElement).onclick = function () { removeSystem(systemName); };
  });

  populateList();

  window.setInterval(timerFunc, 1000);
});
