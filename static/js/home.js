function getSystemNode(systemName)
{
  const systemList = document.querySelector("#system-list");
  const retVal = systemList.querySelector("#system-" + systemName);

  return retVal;
}


function createSystemInfo(systemName)
{
  const systemTemplate = document.querySelector("#system-template");
  const systemList = document.querySelector("#system-list");


  if (getSystemNode(systemName) !== null || systemName === "")
  {
    // TODO: Should update the current item in the list probably.
    return;
  }

  const newTemplate = systemTemplate.cloneNode(true);
  newTemplate.id = "system-" + systemName;
  newTemplate.classList.add("system-list");
  newTemplate.querySelector(".system-title").textContent = systemName;
  newTemplate.style.display = "initial";
  systemList.appendChild(newTemplate);

  newTemplate.querySelector(".remove-system").addEventListener("click", function() { removeSystem(systemName); })

  try {
    if (userSystems.contains(systemName))
    {
      return;
    }
  }
  catch(err) {}


  var request = new XMLHttpRequest();
  request.open("GET", "/systems/add/" + systemName);
  request.onload = loadData(systemName);
  request.onerror = function (e) {
    console.log("Bad response from server");
  }
  request.send();
}

function removeSystem(systemName)
{
  var request = new XMLHttpRequest();
  request.open("GET", "/systems/remove/" + systemName);
  request.onload = function() {
    getSystemNode(systemName).remove();
  }

  request.send();
}

function formatTime(time)
{
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  var output = `${seconds}s`;

  if (minutes > 0)
  {
    output = `${minutes}m ` + output;
  }
  
  return output;
}

function populateList()
{
  if (typeof userSystems === 'undefined')
  {
    return; // User has no system list
  }

  for (system of userSystems)
  {
    if (system !== "")
    {
      createSystemInfo(system);
    }
  }
}

function loadData(system)
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
    systemForm.querySelector(".contract-number").textContent = data.contracts;
    systemForm.querySelector(".loading-text").style.display = "none";
    systemForm.querySelector(".contract-data").style.display = "initial";
  }

  request.send()
}

function parseData(htmlResponse)
{
  var result = new Object();
  result.contracts = 0;

  for (contract of htmlResponse)
  {
    console.log(contract);
    ++result.contracts;
  }

  console.log(result);
  return result;
}

const REFRESH_INTERVAL_SECONDS = 300;
var timeToRefresh = REFRESH_INTERVAL_SECONDS;
function timerFunc() 
{
  const timerDisplay = document.querySelector("#timerValue");
  timeToRefresh--;

  if (timeToRefresh <= 0)
  {
    for (system of userSystems)
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