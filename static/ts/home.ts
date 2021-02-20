declare var bootstrap: any;


function switchCarousel(page: number)
{
  const carousel: any = document.querySelector("#menuCarousel");
  const navItems = document.querySelector("#login-header").querySelectorAll(".nav-link");
  let controls = new bootstrap.Carousel(carousel, {
    interval: false
  });
  controls.to(page);

  navItems.forEach(Utils.deactivateNode);
  Utils.activateNode(navItems[page] as HTMLElement);
}

document.addEventListener("DOMContentLoaded", () => {
});