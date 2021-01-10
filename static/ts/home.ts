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

declare var userSystems: Array<string>;


const filteredItems: Map<number, string> = new Map( 
[
  [17888, "Nitrogen Isotopes"],
  [17887, "Oxygen Isotopes"],
  [17889, "Hydrogen Isotopes"],
  [16274, "Helium Isotopes"],
  [16275, "Stront"]
]);


const GOON_ALLIANCE_ID: number = 1354830081;
const ORIGINAL_TITLE: string = document.title;

function disableNode(node: HTMLElement) { node.style.display = "none"; }
function enableNode(node: HTMLElement)  { node.style.display = "initial"; }

function getSystemNode(systemName: string): HTMLElement
{
  const systemList: HTMLElement = document.querySelector("#system-list");
  return systemList.querySelector("#system-" + systemName);
}


function createSystemInfo(systemName: string): HTMLElement
{
  const systemTemplate: HTMLElement = document.querySelector("#system-template");
  const systemList: HTMLElement = document.querySelector("#system-list");


  if (getSystemNode(systemName) !== null || systemName === "")
  {
    console.warn("Current node already exists");
    return;
  }

  // Create new list entry and add to the list.
  const newTemplate: HTMLElement = systemTemplate.cloneNode(true) as HTMLElement;
  newTemplate.id = `system-${systemName}`;
  newTemplate.classList.add("system-list");
  newTemplate.querySelector(".system-title").textContent = systemName;
  enableNode(newTemplate);
  systemList.appendChild(newTemplate);
  newTemplate.querySelector(".remove-system").addEventListener("click", function() { removeSystem(systemName); })

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
    const totalContracts: number = values.reduce((acc, x) => acc + x, 0);

    if (totalContracts > 0)
    {
      console.log(`${totalContracts} available to fill, setting title.`);
      document.title = `(${totalContracts}) ${ORIGINAL_TITLE}`;
    }
    else
    {
      console.log("No contracts at the moment, setting normal title.");
      document.title = ORIGINAL_TITLE;
    }
  });
}

async function loadData(system: string): Promise<number>
{
  if (system === "")
  {
    return;
  }


  const systemForm = getSystemNode(system);

  const response = await fetch(`/contracts/${system}`);
  const responseData = await response.json();

  const data = parseData(responseData);
  systemForm.querySelector(".contract-number").textContent = String(data.contracts);

  populateTotals(systemForm, data);
  populateNonAllianceContracts(systemForm, data);

  disableNode(systemForm.querySelector(".loading-text"));
  systemForm.querySelectorAll(".contract-data").forEach(enableNode);

  return data.contracts;
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

    enableNode(nonAllianceNode);
  }
  else
  {
    disableNode(nonAllianceNode);
  }
}

function countItem(itemID: number, data: ContractData, result: ParsedResults): boolean
{
  var success: boolean = false;

  for (let item of data.details)
  {
    if (item.type_id == itemID)
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

function parseData(htmlResponse): ParsedResults
{
  var result = new ParsedResults();

  for (let contract of htmlResponse)
  {
    console.log(contract);

    var success: boolean = false;
    

    for (const item of filteredItems.keys())
    {
      success ||= countItem(+item, contract, result);
    }

    if (success)
    {
      // Filter out non-alliance contracts
      if (contract.alliance_id !== GOON_ALLIANCE_ID)
      {
        ++result.nonAllianceContracts;
        result.nonAllianceName.add(contract.issuer_name);
        continue;
      }
      ++result.contracts;
    }
  }

  return result;
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


  populateList();

  window.setInterval(timerFunc, 1000);
});

namespace Utils {

  export function removeAllChildNodes(node: HTMLElement)
  {
    while (node.firstChild)
    {
      node.removeChild(node.firstChild);
    }
  }

  export function formatTime(time: number): string
  {
    const minutes: number = Math.floor(time / 60);
    const seconds: number = time % 60;

    let output: string = `${seconds}s`;

    if (minutes > 0)
    {
      output = `${minutes}m ` + output;
    }
    
    return output;
  }

  export function formatNumber(number: number): string
  {
    if (number >= 1000000)
    {
      return (number / 1000000).toFixed(2) + "M";
    }

    if (number < 1000)
    {
      return String(number);
    }

    return Math.floor(number / 1000) + "," + String(number % 1000).padStart(3, '0');
  }
}