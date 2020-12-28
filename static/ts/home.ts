class ParsedResults 
{
  contracts: number;
  totals: Map<number, number>;

  constructor() {
    this.contracts = 0;
    this.totals = new Map();
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

function disableNode(node: HTMLElement) { node.style.display = "none"; }
function enableNode(node: HTMLElement)  { node.style.display = "initial"; }

function getSystemNode(systemName: string): HTMLElement
{
  const systemList: HTMLElement = document.querySelector("#system-list");
  const retVal: HTMLElement = systemList.querySelector("#system-" + systemName);

  return retVal;
}


function createSystemInfo(systemName: string): HTMLElement
{
  const systemTemplate: HTMLElement = document.querySelector("#system-template");
  const systemList: HTMLElement = document.querySelector("#system-list");


  if (getSystemNode(systemName) !== null || systemName === "")
  {
    console.warn("Current node already exists");
    // TODO: Should update the current item in the list probably.
    return;
  }

  const newTemplate: HTMLElement = systemTemplate.cloneNode(true) as HTMLElement;
  newTemplate.id = "system-" + systemName;
  newTemplate.classList.add("system-list");
  newTemplate.querySelector(".system-title").textContent = systemName;
  enableNode(newTemplate);
  systemList.appendChild(newTemplate);

  newTemplate.querySelector(".remove-system").addEventListener("click", function() { removeSystem(systemName); })

  try {
    if (userSystems.includes(systemName))
    {
      return;
    }
  }
  catch(err) {}


  let request = new XMLHttpRequest();
  request.open("GET", "/systems/add/" + systemName);
  request.onload = function() { 
    loadData(systemName);
  };
  request.onerror = function (e) {
    console.log("Bad response from server");
  }
  request.send();
}

function removeSystem(systemName: string)
{
  let request = new XMLHttpRequest();
  request.open("GET", "/systems/remove/" + systemName);
  request.onload = function() {
    getSystemNode(systemName).remove();
  }

  request.send();
}

function formatTime(time: number): string
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

function formatNumber(number: number): string
{
  if (number > 1000000)
  {
    return (number / 1000000).toFixed(2) + "M";
  }

  return Math.floor(number / 1000) + "," + String(number % 1000).padStart(3, '0');
}

function populateList()
{
  if (typeof userSystems === 'undefined')
  {
    console.warn("User has no defined system list.");
    return;
  }

  for (let system of userSystems)
  {
    if (system !== "")
    {
      createSystemInfo(system);
      loadData(system);
    }
  }
}

function loadData(system: string)
{
  if (system === "")
  {
    return;
  }


  const systemForm = getSystemNode(system);

  var request = new XMLHttpRequest();
  request.open("GET", "/contracts/" + system)
  request.responseType = "json";
  request.onload = function() {
    console.log(request.response)
    const data = parseData(request.response);
    systemForm.querySelector(".contract-number").textContent = String(data.contracts);

    removeAllChildNodes(systemForm.querySelector('.totals'));
    for (const [key, value] of data.totals)
    {
      var totalNode = document.createElement('li');
      totalNode.classList.add(filteredItems[key].split(' ')[0]);
      totalNode.appendChild(document.createTextNode(`${filteredItems[key]}: ${formatNumber(value)}`));
      systemForm.querySelector(".totals").appendChild(totalNode);
      console.log(`Adding ${totalNode}`);
    }

    disableNode(systemForm.querySelector(".loading-text"));
    enableNode(systemForm.querySelector(".contract-data"));
  }

  request.send()
}

function removeAllChildNodes(node: HTMLElement)
{
  while (node.firstChild)
  {
    node.removeChild(node.firstChild);
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
    for (const item in filteredItems)
    {
      success ||= countItem(+item, contract, result);
      console.log(result);
    }

    if (success)
    {
      ++result.contracts;
    }
  }

  return result;
}

const REFRESH_INTERVAL_SECONDS: number = 300;
var timeToRefresh: number = REFRESH_INTERVAL_SECONDS;
function timerFunc(): void
{
  const timerDisplay: HTMLElement = document.querySelector("#timerValue");
  timeToRefresh--;

  if (timeToRefresh <= 0)
  {
    for (let system of userSystems)
    {
      loadData(system);
    }

    timeToRefresh = REFRESH_INTERVAL_SECONDS;
  }

  timerDisplay.textContent = formatTime(timeToRefresh);
}

document.addEventListener("DOMContentLoaded", () => {
  const addSystemForm = document.querySelector("#add-system-form");
  userSystems = userSystems.filter(system => system !== "");

  addSystemForm.addEventListener('submit', (event) => {
    createSystemInfo(event.target[0].value);
    event.stopImmediatePropagation();
    event.preventDefault();
  });


  populateList();

  window.setInterval(timerFunc, 1000);
});