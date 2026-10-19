// Opens any screenshot at its natural size. Without JavaScript the screenshots stay inline.
const viewer = document.querySelector<HTMLDialogElement>(".image-viewer")!;
const viewport = viewer.querySelector<HTMLElement>(".viewer-image")!;
let trigger: HTMLButtonElement | null = null;
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-zoom]")) {
  button.addEventListener("click", () => {
    trigger = button;
    viewer.querySelector("h2")!.textContent = button.dataset.title!;
    viewport.style.setProperty("--image-width", `${button.dataset.width}px`);
    viewport.replaceChildren(button.querySelector("picture")!.cloneNode(true));
    viewer.showModal();
    viewport.scrollTo(0, 0);
  });
}
viewer.addEventListener("click", (event) => {
  if (event.target === viewer) viewer.close();
});
viewer.addEventListener("close", () => trigger?.focus({ preventScroll: true }));
