
namespace Utils {

  export function removeAllChildNodes(node: HTMLElement)
  {
    while (node.firstChild)
    {
      node.removeChild(node.firstChild);
    }
  }

  export function queryNeighbor(node: HTMLElement, selector: string)
  {
    return node.parentElement.querySelector(selector);
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


  export function notifyUser(message: string)
  {
    if (!("Notification" in window))
    {
      alert("This browser does not support desktop notifications");
    }

    else if (Notification.permission === "granted")
    {
      console.log(`Notifying user: ${message}`);
      let notification = new Notification("New fuel contracts", {body: message});
    }
    else if (Notification.permission !== "denied")
    {
      Notification.requestPermission().then(function (granted: string) {
        console.log(`Notification request returned: ${granted}`);
        if (granted === "granted")
        {
          let notification = new Notification(message);
        }
      });
    }
    else
    {
      alert(Notification.permission);
    }
  }
}