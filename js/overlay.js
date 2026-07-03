// Manages the pool of AR label DOM nodes, reusing them frame to frame.

const KM = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);

export class Overlay {
  constructor(root) {
    this.root = root;
    this.pool = [];
  }

  _node(i) {
    if (this.pool[i]) return this.pool[i];
    const el = document.createElement("div");
    el.className = "poi";
    el.innerHTML =
      '<div class="dot"></div><div class="tick"></div>' +
      '<div class="name"></div><div class="meta"></div>';
    el.refs = { name: el.querySelector(".name"), meta: el.querySelector(".meta") };
    this.root.appendChild(el);
    this.pool[i] = el;
    return el;
  }

  // items: [{ label, meta, kind, x, y, near }]
  render(items) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const el = this._node(i);
      el.style.display = "flex";
      el.style.left = `${it.x}px`;
      el.style.top = `${it.y}px`;
      el.className = `poi kind-${it.kind}${it.near ? " near" : ""}`;
      if (el.refs.name.textContent !== it.label) el.refs.name.textContent = it.label;
      if (el.refs.meta.textContent !== it.meta) el.refs.meta.textContent = it.meta;
    }
    for (let i = items.length; i < this.pool.length; i++) {
      this.pool[i].style.display = "none";
    }
  }
}

export function metaLine(entry) {
  const bits = [KM(entry.dist)];
  if (entry.poi.k === "peak" && entry.poi.el) bits.push(`${entry.poi.el} m`);
  return bits.join(" · ");
}
