var ParsedResults = /** @class */ (function () {
    function ParsedResults() {
        this.contracts = 0;
        this.totals = new Map();
    }
    return ParsedResults;
}());
var filteredItems = new Map([
    [17888, "Nitrogen Isotopes"],
    [17887, "Oxygen Isotopes"],
    [17889, "Hydrogen Isotopes"],
    [16274, "Helium Isotopes"],
    [16275, "Stront"]
]);
function disableNode(node) { node.style.display = "none"; }
function enableNode(node) { node.style.display = "initial"; }
function getSystemNode(systemName) {
    var systemList = document.querySelector("#system-list");
    var retVal = systemList.querySelector("#system-" + systemName);
    return retVal;
}
function createSystemInfo(systemName) {
    var systemTemplate = document.querySelector("#system-template");
    var systemList = document.querySelector("#system-list");
    if (getSystemNode(systemName) !== null || systemName === "") {
        console.warn("Current node already exists");
        // TODO: Should update the current item in the list probably.
        return;
    }
    var newTemplate = systemTemplate.cloneNode(true);
    newTemplate.id = "system-" + systemName;
    newTemplate.classList.add("system-list");
    newTemplate.querySelector(".system-title").textContent = systemName;
    enableNode(newTemplate);
    systemList.appendChild(newTemplate);
    newTemplate.querySelector(".remove-system").addEventListener("click", function () { removeSystem(systemName); });
    try {
        if (userSystems.includes(systemName)) {
            return;
        }
    }
    catch (err) { }
    var request = new XMLHttpRequest();
    request.open("GET", "/systems/add/" + systemName);
    request.onload = function () {
        loadData(systemName);
    };
    request.onerror = function (e) {
        console.log("Bad response from server");
    };
    request.send();
}
function removeSystem(systemName) {
    var request = new XMLHttpRequest();
    request.open("GET", "/systems/remove/" + systemName);
    request.onload = function () {
        getSystemNode(systemName).remove();
    };
    request.send();
}
function formatTime(time) {
    var minutes = Math.floor(time / 60);
    var seconds = time % 60;
    var output = seconds + "s";
    if (minutes > 0) {
        output = minutes + "m " + output;
    }
    return output;
}
function formatNumber(number) {
    if (number > 1000000) {
        return (number / 1000000).toFixed(2) + "M";
    }
    return Math.floor(number / 1000) + "," + String(number % 1000).padStart(3, '0');
}
function populateList() {
    if (typeof userSystems === 'undefined') {
        console.warn("User has no defined system list.");
        return;
    }
    for (var _i = 0, userSystems_1 = userSystems; _i < userSystems_1.length; _i++) {
        var system = userSystems_1[_i];
        if (system !== "") {
            createSystemInfo(system);
        }
    }
}
function loadData(system) {
    if (system === "") {
        return;
    }
    var systemForm = getSystemNode(system);
    var request = new XMLHttpRequest();
    request.open("GET", "/contracts/" + system);
    request.responseType = "json";
    request.onload = function () {
        console.log(request.response);
        var data = parseData(request.response);
        systemForm.querySelector(".contract-number").textContent = String(data.contracts);
        removeAllChildNodes(systemForm.querySelector('.totals'));
        for (var _i = 0, _a = data.totals; _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            var totalNode = document.createElement('li');
            totalNode.classList.add(filteredItems[key].split(' ')[0]);
            totalNode.appendChild(document.createTextNode(filteredItems[key] + ": " + formatNumber(value)));
            systemForm.querySelector(".totals").appendChild(totalNode);
            console.log("Adding " + totalNode);
        }
        disableNode(systemForm.querySelector(".loading-text"));
        enableNode(systemForm.querySelector(".contract-data"));
    };
    request.send();
}
function removeAllChildNodes(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}
function countItem(itemID, data, result) {
    var success = false;
    for (var _i = 0, _a = data.details; _i < _a.length; _i++) {
        var item = _a[_i];
        if (item.type_id == itemID) {
            if (!result.totals.has(itemID)) {
                result.totals.set(itemID, 0);
            }
            result.totals.set(itemID, result.totals.get(itemID) + item.quantity);
            success = true;
        }
    }
    return success;
}
function parseData(htmlResponse) {
    var result = new ParsedResults();
    for (var _i = 0, htmlResponse_1 = htmlResponse; _i < htmlResponse_1.length; _i++) {
        var contract = htmlResponse_1[_i];
        console.log(contract);
        var success = false;
        for (var item in filteredItems) {
            success || ;
            countItem(+item, contract, result);
            console.log(result);
        }
        if (success) {
            ++result.contracts;
        }
    }
    return result;
}
var REFRESH_INTERVAL_SECONDS = 300;
var timeToRefresh = REFRESH_INTERVAL_SECONDS;
function timerFunc() {
    var timerDisplay = document.querySelector("#timerValue");
    timeToRefresh--;
    if (timeToRefresh <= 0) {
        for (var _i = 0, userSystems_2 = userSystems; _i < userSystems_2.length; _i++) {
            var system = userSystems_2[_i];
            loadData(system);
        }
        timeToRefresh = REFRESH_INTERVAL_SECONDS;
    }
    timerDisplay.textContent = formatTime(timeToRefresh);
}
document.addEventListener("DOMContentLoaded", function () {
    var addSystemForm = document.querySelector("#add-system-form");
    userSystems = userSystems.filter(function (system) { return system !== ""; });
    addSystemForm.addEventListener('submit', function (event) {
        createSystemInfo(event.target[0].value);
        event.stopImmediatePropagation();
        event.preventDefault();
    });
    populateList();
    window.setInterval(timerFunc, 1000);
});
