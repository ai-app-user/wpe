// app.js
// Include after data2.js (expects window.PAGE_CONFIG).

(function () {
  const INITIAL_CONFIG = deepClone(window.PAGE_CONFIG || {});
  let config = deepClone(INITIAL_CONFIG);

  let selected = null;   // { kind, nodeRef, domEl }
  let activeLayer = "layer3";
  let editing = false;
  let dragState = null;

  // draft edits + dirty flag
  let draft = null;
  let dirty = false;

  const nodeToDom = new WeakMap();

  // DOM
  const elPage = document.getElementById("page");
  const elPageBg = document.getElementById("pageBg");
  const elLayer1 = document.getElementById("layer1");
  const elLayer2 = document.getElementById("layer2");
  const elLayer3 = document.getElementById("layer3");
  const elBlocksCol = document.getElementById("blocksCol");
  const elEditorDock = document.getElementById("editorDock");
  const elEditHint = document.getElementById("editHint");

  const modeBadge = document.getElementById("modeBadge");
  const layerBadge = document.getElementById("layerBadge");
  const selBadge = document.getElementById("selBadge");

  // Toolbar
  const layerBtn1 = document.getElementById("layerBtn1");
  const layerBtn2 = document.getElementById("layerBtn2");
  const layerBtn3 = document.getElementById("layerBtn3");

  const selPrev = document.getElementById("selPrev");
  const selNext = document.getElementById("selNext");
  const selParent = document.getElementById("selParent");
  const selChild = document.getElementById("selChild");

  const moveUp = document.getElementById("moveUp");
  const moveDown = document.getElementById("moveDown");
  const addAfter = document.getElementById("addAfter");
  const delNode = document.getElementById("delNode");

  // Bottom buttons
  const exportJsonBtn = document.getElementById("exportJson");
  const copyJsonBtn = document.getElementById("copyJson");
  const resetBtn = document.getElementById("reset");

  // Control blocks
  const sectionTitle = document.getElementById("sectionTitle");

  const rowCommon1 = document.getElementById("rowCommon1");
  const textControls = document.getElementById("textControls");
  const blockControls = document.getElementById("blockControls");
  const colControls = document.getElementById("colControls");
  const picControls = document.getElementById("picControls");
  const pageControls = document.getElementById("pageControls");

  // Common inputs
  const uiOpacity = document.getElementById("uiOpacity");
  const uiColor = document.getElementById("uiColor");

  // Text inputs
  const uiFontPreset = document.getElementById("uiFontPreset");
  const uiFontCustom = document.getElementById("uiFontCustom");
  const uiSize = document.getElementById("uiSize");
  const uiWeight = document.getElementById("uiWeight");
  const uiAlign = document.getElementById("uiAlign");
  const uiText = document.getElementById("uiText");

  // Block inputs
  const uiHeightPct = document.getElementById("uiHeightPct");
  const uiWidthPct = document.getElementById("uiWidthPct");
  const uiPaddingPx = document.getElementById("uiPaddingPx");
  const uiAlignX = document.getElementById("uiAlignX");
  const uiAlignY = document.getElementById("uiAlignY");
  const uiBgUrl = document.getElementById("uiBgUrl");

  // Column inputs
  const uiColWidthPct = document.getElementById("uiColWidthPct");

  // Picture inputs
  const uiPicX = document.getElementById("uiPicX");
  const uiPicY = document.getElementById("uiPicY");
  const uiPicW = document.getElementById("uiPicW");
  const uiPicAlign = document.getElementById("uiPicAlign");
  const uiPicRot = document.getElementById("uiPicRot");
  const uiPicUrl = document.getElementById("uiPicUrl");

  // Page inputs
  const uiPageBgUrl = document.getElementById("uiPageBgUrl");
  const uiPageBgPos = document.getElementById("uiPageBgPos");
  const uiPageBgSize = document.getElementById("uiPageBgSize");
  const uiOutsideBg = document.getElementById("uiOutsideBg");

  // Apply/revert + preview
  const uiApply = document.getElementById("uiApply");
  const uiRevert = document.getElementById("uiRevert");
  const uiPreview = document.getElementById("uiPreview");

  init();

  function init() {
    const url = new URL(location.href);
    const key = url.searchParams.get("edit");
    const secret = config && config.editor ? config.editor.secret : null;
    editing = !!(secret && key && key === secret);

    setEditingUI(editing);

    // default active layer
    setActiveLayer("layer3");

    layerBtn1.addEventListener("click", () => setActiveLayer("layer1"));
    layerBtn2.addEventListener("click", () => setActiveLayer("layer2"));
    layerBtn3.addEventListener("click", () => setActiveLayer("layer3"));

    selPrev.addEventListener("click", () => selectPrevNext(-1));
    selNext.addEventListener("click", () => selectPrevNext(1));
    selParent.addEventListener("click", selectParentSmart);
    selChild.addEventListener("click", selectFirstChildSmart);

    moveUp.addEventListener("click", () => moveSelectedNode(-1));
    moveDown.addEventListener("click", () => moveSelectedNode(1));
    addAfter.addEventListener("click", addNodeAfterSelected);
    delNode.addEventListener("click", deleteSelectedNode);

    exportJsonBtn.addEventListener("click", () => exportFullJson(false));
    copyJsonBtn.addEventListener("click", () => exportFullJson(true));
    resetBtn.addEventListener("click", () => {
      config = deepClone(INITIAL_CONFIG);
      clearSelection();
      renderAll();
      applyOutsideBg();
      resetDraft();
      refreshControls();
      updateToolbarState();
    });

    // Selection click
    elPage.addEventListener("click", (e) => {
      if (!editing) return;

      const hit = findSelectable(e.target);
      if (!hit) {
        clearSelection();
        resetDraft();
        refreshControls();
        updateToolbarState();
        return;
      }

      // enforce active layer selection
      if (activeLayer === "layer1" && hit.kind !== "pagebg") return;
      if (activeLayer === "layer2" && hit.kind !== "picture") return;
      if (activeLayer === "layer3" && !["block", "text", "group", "col"].includes(hit.kind)) return;

      selectNode(hit);
      loadDraftFromSelection();
      refreshControls();
      updateToolbarState();
    });

    // Dragging pictures in layer2
    elPage.addEventListener("pointerdown", (e) => {
      if (!editing) return;
      if (activeLayer !== "layer2") return;

      const hit = findSelectable(e.target);
      if (!hit || hit.kind !== "picture") return;

      e.preventDefault();
      const rect = elPage.getBoundingClientRect();
      dragState = {
        hit,
        rect,
        startX: e.clientX,
        startY: e.clientY,
        startXPct: hit.nodeRef.xPct,
        startYPct: hit.nodeRef.yPct
      };
      if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    });

    elPage.addEventListener("pointermove", (e) => {
      if (!dragState) return;

      const rect = dragState.rect;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      const dxPct = (dx / rect.width) * 100;
      const dyPct = (dy / rect.height) * 100;

      dragState.hit.nodeRef.xPct = clamp(dragState.startXPct + dxPct, 0, 100);
      dragState.hit.nodeRef.yPct = clamp(dragState.startYPct + dyPct, 0, 100);

      positionPicture(dragState.hit.domEl, dragState.hit.nodeRef);

      // keep draft in sync if selected
      if (selected && selected.nodeRef === dragState.hit.nodeRef) {
        loadDraftFromSelection();
        refreshControls();
      }
    });

    elPage.addEventListener("pointerup", () => (dragState = null));
    elPage.addEventListener("pointercancel", () => (dragState = null));

    // Draft change wiring
    const onDraftChange = () => {
      if (!selected) return;
      if (!draft) return;

      updateDraftFromUI();
      applyDraftPreviewToDom();
      setDirty(true);
      updatePreviewBox();
    };

    const inputs = [
      uiOpacity, uiColor,
      uiFontPreset, uiFontCustom, uiSize, uiWeight, uiAlign, uiText,
      uiHeightPct, uiWidthPct, uiPaddingPx, uiAlignX, uiAlignY, uiBgUrl,
      uiColWidthPct,
      uiPicX, uiPicY, uiPicW, uiPicAlign, uiPicRot, uiPicUrl,
      uiPageBgUrl, uiPageBgPos, uiPageBgSize, uiOutsideBg
    ];
    for (const el of inputs) {
      if (!el) continue;
      const evt = (el.tagName === "SELECT") ? "change" : "input";
      el.addEventListener(evt, onDraftChange);
    }

    uiApply.addEventListener("click", () => {
      if (!selected || !draft || !dirty) return;
      commitDraftToNode();
      setDirty(false);
      renderAll();
      applyOutsideBg();
      setLayerHitTesting(activeLayer);
      reselectCurrent();
      loadDraftFromSelection();
      refreshControls();
      updateToolbarState();
    });

    uiRevert.addEventListener("click", () => {
      if (!selected) return;
      loadDraftFromSelection();
      setDirty(false);
      refreshControls();
      updateToolbarState();
    });

    renderAll();
    applyOutsideBg();
    setLayerHitTesting(activeLayer);
    updateToolbarState();
    refreshControls();
  }

  function setActiveLayer(layer) {
    activeLayer = layer;
    setLayerHitTesting(layer);

    layerBtn1.classList.toggle("active", layer === "layer1");
    layerBtn2.classList.toggle("active", layer === "layer2");
    layerBtn3.classList.toggle("active", layer === "layer3");

    clearSelection();
    resetDraft();
    refreshControls();
    updateToolbarState();
    updateBadges();
  }

  function setEditingUI(on) {
    document.body.classList.toggle("editing", on);
    elEditorDock.classList.toggle("enabled", on);
    elEditHint.style.display = on ? "block" : "none";

    if (!on) {
      elLayer1.style.pointerEvents = "none";
      elLayer2.style.pointerEvents = "none";
      elLayer3.style.pointerEvents = "auto";
    }

    updateBadges();
  }

  function setLayerHitTesting(layer) {
    if (!editing) return;

    elLayer1.style.pointerEvents = "none";
    elLayer2.style.pointerEvents = "none";
    elLayer3.style.pointerEvents = "none";

    if (layer === "layer1") elLayer1.style.pointerEvents = "auto";
    if (layer === "layer2") elLayer2.style.pointerEvents = "auto";
    if (layer === "layer3") elLayer3.style.pointerEvents = "auto";
  }

  function updateBadges() {
    modeBadge.textContent = editing ? "edit" : "view";
    layerBadge.textContent = activeLayer;
    selBadge.textContent = selected
      ? (selected.kind + ":" + (selected.nodeRef && selected.nodeRef.id ? selected.nodeRef.id : "(no id)"))
      : "none";
  }

  function updateToolbarState() {
    updateBadges();

    // enable/disable node ops based on selection context
    const ctx = getSelectionContext();

    const canOps = (activeLayer === "layer3") && !!ctx;
    moveUp.disabled = !canOps || ctx.index <= 0;
    moveDown.disabled = !canOps || ctx.index >= ctx.container.length - 1;
    delNode.disabled = !canOps || (ctx.kind === "block" && ctx.container.length <= 1);
    addAfter.disabled = (activeLayer !== "layer3");

    // selection helpers can work in layer3; in layer2 we keep only next/prev disabled
    selPrev.disabled = (activeLayer !== "layer3");
    selNext.disabled = (activeLayer !== "layer3");
    selParent.disabled = (activeLayer !== "layer3" || !selected);
    selChild.disabled = (activeLayer !== "layer3" || !selected);

    // Apply/Revert handled by dirty
    uiApply.disabled = !dirty;
    uiRevert.disabled = !dirty;
  }

  function setDirty(v) {
    dirty = !!v;
    uiApply.disabled = !dirty;
    uiRevert.disabled = !dirty;
  }

  function resetDraft() {
    draft = null;
    setDirty(false);
    uiPreview.value = "";
  }

  function loadDraftFromSelection() {
    if (!selected || !selected.nodeRef) {
      resetDraft();
      return;
    }
    draft = getEditableProps(selected.nodeRef, selected.kind);
    setDirty(false);
    updatePreviewBox();
  }

  function updatePreviewBox() {
    if (!draft) uiPreview.value = "";
    else uiPreview.value = JSON.stringify(draft, null, 2);
  }

  function refreshControls() {
    // Hide everything first
    rowCommon1.style.display = "none";
    textControls.style.display = "none";
    blockControls.style.display = "none";
    colControls.style.display = "none";
    picControls.style.display = "none";
    pageControls.style.display = "none";

    if (!selected || !draft) {
      sectionTitle.textContent = "No selection";
      clearAllInputs();
      uiApply.disabled = true;
      uiRevert.disabled = true;
      return;
    }

    // show relevant sections
    sectionTitle.textContent = selected.kind;

    if (selected.kind === "pagebg") {
      pageControls.style.display = "";
      // fill inputs
      uiPageBgUrl.value = draft.backgroundImageUrl || "";
      uiPageBgPos.value = draft.backgroundPosition || "";
      uiPageBgSize.value = draft.backgroundSize || "";
      uiOutsideBg.value = (config.ui && config.ui.outsideBgColor) ? toHexOrFallback(config.ui.outsideBgColor, "#0b0b10") : "#0b0b10";
      return;
    }

    if (selected.kind === "picture") {
      rowCommon1.style.display = "";
      picControls.style.display = "";

      uiOpacity.value = valOrEmpty(draft.opacity);
      uiColor.value = "#ffffff"; // not used for picture; kept hidden via no-change logic
      uiPicX.value = valOrEmpty(draft.xPct);
      uiPicY.value = valOrEmpty(draft.yPct);
      uiPicW.value = valOrEmpty(draft.wPct);
      uiPicAlign.value = draft.align || "";
      uiPicRot.value = valOrEmpty(draft.rotationDeg);
      uiPicUrl.value = draft.url || "";
      return;
    }

    // Layer3 kinds
    rowCommon1.style.display = "";
    uiOpacity.value = valOrEmpty(draft.opacity);
    uiColor.value = toHexOrFallback(draft.color || "#ffffff", "#ffffff");

    if (selected.kind === "text") {
      textControls.style.display = "";
      uiFontPreset.value = "";
      uiFontCustom.value = draft.fontFamily || "";
      uiSize.value = valOrEmpty(draft.sizePx);
      uiWeight.value = draft.weight != null ? String(draft.weight) : "";
      uiAlign.value = draft.align || "";
      uiText.value = draft.text != null ? String(draft.text) : "";
      return;
    }

    if (selected.kind === "block") {
      blockControls.style.display = "";
      uiHeightPct.value = valOrEmpty(draft.heightPct);
      uiWidthPct.value = valOrEmpty(draft.widthPct);
      uiPaddingPx.value = valOrEmpty(draft.paddingPx);
      uiAlignX.value = draft.alignX || "";
      uiAlignY.value = draft.alignY || "";
      uiBgUrl.value = draft.backgroundImageUrl || "";
      return;
    }

    if (selected.kind === "col") {
      colControls.style.display = "";
      uiColWidthPct.value = valOrEmpty(draft.widthPct);
      return;
    }

    if (selected.kind === "group") {
      // no special controls yet
      return;
    }
  }

  function clearAllInputs() {
    const els = [
      uiOpacity, uiColor,
      uiFontPreset, uiFontCustom, uiSize, uiWeight, uiAlign, uiText,
      uiHeightPct, uiWidthPct, uiPaddingPx, uiAlignX, uiAlignY, uiBgUrl,
      uiColWidthPct,
      uiPicX, uiPicY, uiPicW, uiPicAlign, uiPicRot, uiPicUrl,
      uiPageBgUrl, uiPageBgPos, uiPageBgSize, uiOutsideBg
    ];
    for (const el of els) {
      if (!el) continue;
      if (el.tagName === "SELECT") el.value = "";
      else if (el.type === "color") el.value = "#ffffff";
      else el.value = "";
    }
  }

  function updateDraftFromUI() {
    if (!draft || !selected) return;

    if (selected.kind === "pagebg") {
      draft.backgroundImageUrl = uiPageBgUrl.value.trim() || undefined;
      draft.backgroundPosition = uiPageBgPos.value.trim() || undefined;
      draft.backgroundSize = uiPageBgSize.value.trim() || undefined;

      // outside bg stored at config.ui
      if (!config.ui) config.ui = {};
      config.ui.outsideBgColor = uiOutsideBg.value || "#0b0b10";
      applyOutsideBg();
      return;
    }

    if (selected.kind === "picture") {
      draft.opacity = numOrUndef(uiOpacity.value);
      draft.xPct = numOrUndef(uiPicX.value);
      draft.yPct = numOrUndef(uiPicY.value);
      draft.wPct = numOrUndef(uiPicW.value);
      draft.align = uiPicAlign.value.trim() || undefined;
      draft.rotationDeg = numOrUndef(uiPicRot.value);
      draft.url = uiPicUrl.value.trim() || undefined;
      return;
    }

    // common (Layer3)
    draft.opacity = numOrUndef(uiOpacity.value);
    draft.color = uiColor.value || undefined;

    if (selected.kind === "text") {
      const font = uiFontCustom.value.trim() || uiFontPreset.value.trim();
      if (font) draft.fontFamily = font; else delete draft.fontFamily;

      draft.sizePx = numOrUndef(uiSize.value);
      draft.weight = uiWeight.value ? parseInt(uiWeight.value, 10) : undefined;
      draft.align = uiAlign.value.trim() || undefined;
      draft.text = uiText.value;
      return;
    }

    if (selected.kind === "block") {
      draft.heightPct = numOrUndef(uiHeightPct.value);
      draft.widthPct = numOrUndef(uiWidthPct.value);
      draft.paddingPx = numOrUndef(uiPaddingPx.value);
      draft.alignX = uiAlignX.value.trim() || undefined;
      draft.alignY = uiAlignY.value.trim() || undefined;
      draft.backgroundImageUrl = uiBgUrl.value.trim() || undefined;
      return;
    }

    if (selected.kind === "col") {
      draft.widthPct = numOrUndef(uiColWidthPct.value);
      return;
    }
  }

  // Show immediate preview for simple items (pictures + text)
  function applyDraftPreviewToDom() {
    if (!selected || !selected.domEl || !draft) return;

    if (selected.kind === "picture") {
      const p = selected.nodeRef;
      // update the real node too for drag-like feel, but keep dirty until Apply
      if (draft.xPct != null) p.xPct = draft.xPct;
      if (draft.yPct != null) p.yPct = draft.yPct;
      if (draft.wPct != null) p.wPct = draft.wPct;
      if (draft.align) p.align = draft.align;
      if (draft.opacity != null) p.opacity = draft.opacity;
      if (draft.rotationDeg != null) p.rotationDeg = draft.rotationDeg;
      if (draft.url) p.url = draft.url;

      // update DOM
      selected.domEl.style.opacity = p.opacity != null ? String(p.opacity) : "1";
      selected.domEl.style.width = (p.wPct != null ? p.wPct : 20) + "%";
      selected.domEl.style.transform = "translateZ(0) rotate(" + (p.rotationDeg || 0) + "deg)";
      positionPicture(selected.domEl, p);
      const img = selected.domEl.querySelector("img");
      if (img && draft.url) img.src = draft.url;
      return;
    }

    if (selected.kind === "text") {
      const el = selected.domEl;
      if (draft.fontFamily) el.style.fontFamily = draft.fontFamily;
      if (draft.color) el.style.color = draft.color;
      if (draft.sizePx != null) el.style.fontSize = draft.sizePx + "px";
      if (draft.weight != null) el.style.fontWeight = String(draft.weight);
      if (draft.align) el.style.textAlign = draft.align;
      if (draft.opacity != null) el.style.opacity = String(draft.opacity);
      if (draft.text != null) el.textContent = draft.text;
    }
  }

  function commitDraftToNode() {
    if (!selected || !draft) return;
    const node = selected.nodeRef;

    const allowed = allowedKeysForKind(selected.kind);

    // merge allowed keys, never touching children/columns
    for (const k of Object.keys(draft)) {
      if (!allowed.has(k)) continue;
      const v = draft[k];
      if (v === undefined) {
        delete node[k];
      } else {
        node[k] = v;
      }
    }

    // special: pagebg commits into config.layer1 and outside bg already updated in config.ui
    if (selected.kind === "pagebg") {
      if (!config.layer1) config.layer1 = {};
      const l1 = config.layer1;
      if (draft.backgroundImageUrl !== undefined) l1.backgroundImageUrl = draft.backgroundImageUrl; else delete l1.backgroundImageUrl;
      if (draft.backgroundPosition !== undefined) l1.backgroundPosition = draft.backgroundPosition; else delete l1.backgroundPosition;
      if (draft.backgroundSize !== undefined) l1.backgroundSize = draft.backgroundSize; else delete l1.backgroundSize;
    }
  }

  function allowedKeysForKind(kind) {
    if (kind === "text") return new Set(["text","fontFamily","color","sizePx","weight","align","opacity"]);
    if (kind === "block") return new Set(["heightPct","widthPct","alignX","alignY","paddingPx","backgroundImageUrl"]);
    if (kind === "col") return new Set(["widthPct"]);
    if (kind === "group") return new Set([]);
    if (kind === "picture") return new Set(["url","xPct","yPct","wPct","align","opacity","rotationDeg"]);
    if (kind === "pagebg") return new Set(["backgroundImageUrl","backgroundPosition","backgroundSize"]);
    return new Set([]);
  }

  function getEditableProps(node, kind) {
    const out = {};
    if (!node || typeof node !== "object") return out;

    if (kind === "picture") {
      copyIf(node, out, ["id","url","xPct","yPct","wPct","align","opacity","rotationDeg"]);
      return out;
    }
    if (kind === "pagebg") {
      const l1 = config.layer1 || {};
      out.backgroundImageUrl = l1.backgroundImageUrl || "";
      out.backgroundPosition = l1.backgroundPosition || "";
      out.backgroundSize = l1.backgroundSize || "";
      return out;
    }
    if (kind === "text") {
      copyIf(node, out, ["id","type","text","fontFamily","color","sizePx","weight","align","opacity"]);
      return out;
    }
    if (kind === "block") {
      copyIf(node, out, ["id","heightPct","widthPct","alignX","alignY","paddingPx","backgroundImageUrl","opacity","color"]);
      return out;
    }
    if (kind === "col") {
      copyIf(node, out, ["id","widthPct"]);
      return out;
    }
    if (kind === "group") {
      copyIf(node, out, ["id","type"]);
      return out;
    }

    return out;
  }

  function copyIf(src, dst, keys) {
    for (const k of keys) {
      if (k in src) dst[k] = deepClone(src[k]);
    }
  }

  function reselectCurrent() {
    if (!selected || !selected.nodeRef) return;
    const dom = findDomByIdAndKind(selected.nodeRef.id, selected.kind);
    if (dom) selectNode({ kind: selected.kind, nodeRef: selected.nodeRef, domEl: dom });
  }

  // Rendering
  function renderAll() {
    clearSelection();
    renderLayer1();
    renderLayer2();
    renderLayer3();
    updateBadges();
  }

  function renderLayer1() {
    const l1 = config.layer1 || {};
    const bgUrl = l1.backgroundImageUrl;

    elPageBg.style.backgroundPosition = l1.backgroundPosition || "center";
    elPageBg.style.backgroundSize = l1.backgroundSize || "cover";
    elPageBg.style.backgroundImage = bgUrl ? "url(\"" + bgUrl + "\")" : "none";

    elPageBg.__nodeRef = config.layer1 || {};
    nodeToDom.set(elPageBg.__nodeRef, elPageBg);
  }

  function renderLayer2() {
    elLayer2.innerHTML = "";
    const pics = (config.layer2 && config.layer2.pictures) ? config.layer2.pictures : [];

    for (const p of pics) {
      const wrap = document.createElement("div");
      wrap.className = "floatPic";
      wrap.dataset.kind = "picture";
      wrap.dataset.id = p.id || "";
      wrap.__nodeRef = p;

      const img = document.createElement("img");
      img.alt = p.id || "picture";
      img.draggable = false;
      img.src = p.url;
      wrap.appendChild(img);

      wrap.style.opacity = (p.opacity != null ? p.opacity : 1);
      wrap.style.width = (p.wPct != null ? p.wPct : 20) + "%";
      wrap.style.transform = "translateZ(0) rotate(" + (p.rotationDeg || 0) + "deg)";
      positionPicture(wrap, p);

      nodeToDom.set(p, wrap);
      elLayer2.appendChild(wrap);
    }
  }

  function positionPicture(domEl, p) {
    domEl.style.left = (p.xPct != null ? p.xPct : 0) + "%";
    domEl.style.top = (p.yPct != null ? p.yPct : 0) + "%";

    const align = p.align || "left";
    let tx = "0%";
    if (align === "center") tx = "-50%";
    if (align === "right") tx = "-100%";
    domEl.style.translate = tx + " 0%";
  }

  function renderLayer3() {
    elBlocksCol.innerHTML = "";
    const defaults = (config.layer3 && config.layer3.defaults) ? config.layer3.defaults : {};
    const blocks = (config.layer3 && config.layer3.blocks) ? config.layer3.blocks : [];

    for (const b of blocks) {
      const vb = document.createElement("div");
      vb.className = "vblock";
      vb.dataset.kind = "block";
      vb.dataset.id = b.id || "";
      vb.__nodeRef = b;

      vb.style.height = (b.heightPct != null ? b.heightPct : 10) + "%";
      vb.style.width = (b.widthPct != null ? b.widthPct : 100) + "%";
      if (b.widthPct && b.widthPct < 100) {
        vb.style.marginLeft = "auto";
        vb.style.marginRight = "auto";
      }

      vb.style.alignItems = alignXToCss(b.alignX || "center");
      vb.style.justifyContent = alignYToCss(b.alignY || "center");
      vb.style.padding = (b.paddingPx != null ? b.paddingPx : 12) + "px";

      if (b.backgroundImageUrl) {
        const bg = document.createElement("div");
        bg.className = "blockBg";
        bg.style.backgroundImage = "url(\"" + b.backgroundImageUrl + "\")";
        vb.appendChild(bg);
      }

      const blockDefaults = b.defaults || {};
      const fontFamily = blockDefaults.fontFamily || defaults.fontFamily || "system-ui";
      const color = blockDefaults.color || defaults.color || "#fff";
      vb.style.fontFamily = fontFamily;
      vb.style.color = color;

      nodeToDom.set(b, vb);

      const content = document.createElement("div");
      content.className = "content";
      content.style.alignItems = alignXToCss(b.alignX || "center");
      content.style.width = "100%";

      const children = b.children || [];
      for (const child of children) {
        content.appendChild(renderChild(child, { fontFamily, color }, b));
      }

      vb.appendChild(content);
      elBlocksCol.appendChild(vb);
    }
  }

  function renderChild(node, inherited, parentBlock) {
    if (node.type === "text") {
      const d = document.createElement("div");
      d.className = "textLine";
      d.dataset.kind = "text";
      d.dataset.id = node.id || "";
      d.__nodeRef = node;

      d.style.fontFamily = node.fontFamily || inherited.fontFamily;
      d.style.color = node.color || inherited.color;
      if (node.sizePx) d.style.fontSize = node.sizePx + "px";
      if (node.weight) d.style.fontWeight = node.weight;
      if (node.opacity != null) d.style.opacity = node.opacity;
      d.style.textAlign = node.align || "left";
      d.textContent = node.text != null ? node.text : "";

      attachMeta(node, parentBlock, "block");
      nodeToDom.set(node, d);
      return d;
    }

    if (node.type === "group") {
      const row = document.createElement("div");
      row.className = "groupRow";
      row.dataset.kind = "group";
      row.dataset.id = node.id || "";
      row.__nodeRef = node;

      attachMeta(node, parentBlock, "block");
      nodeToDom.set(node, row);

      const cols = node.columns || [];
      const anyWidths = cols.some((c) => typeof c.widthPct === "number");

      for (const col of cols) {
        const c = document.createElement("div");
        c.className = "col";
        c.dataset.kind = "col";
        c.dataset.id = col.id || "";
        c.__nodeRef = col;

        c.style.flex = anyWidths ? ("0 0 " + (col.widthPct != null ? col.widthPct : 0) + "%") : "1 1 0";

        attachMeta(col, node, "group");
        nodeToDom.set(col, c);

        const colInherited = {
          fontFamily: (col.defaults && col.defaults.fontFamily) ? col.defaults.fontFamily : inherited.fontFamily,
          color: (col.defaults && col.defaults.color) ? col.defaults.color : inherited.color
        };

        const subChildren = col.children || [];
        for (const sub of subChildren) {
          const childEl = renderChild(sub, colInherited, parentBlock);
          c.appendChild(childEl);
          attachMeta(sub, col, "col");
        }

        row.appendChild(c);
      }

      return row;
    }

    return document.createElement("div");
  }

  // Selection
  function findSelectable(target) {
    let el = target;
    while (el && el !== document.body) {
      const kind = el.dataset && el.dataset.kind;
      if (kind === "picture" || kind === "block" || kind === "text" || kind === "group" || kind === "col" || kind === "pagebg") {
        return { kind: kind, domEl: el, nodeRef: el.__nodeRef || (kind === "pagebg" ? (config.layer1 || {}) : null) };
      }
      el = el.parentElement;
    }
    return null;
  }

  function selectNode(hit) {
    clearSelection();
    selected = hit;
    if (hit.domEl) hit.domEl.classList.add("selectedOutline");
    updateBadges();
  }

  function clearSelection() {
    const els = document.querySelectorAll(".selectedOutline");
    for (const x of els) x.classList.remove("selectedOutline");
    selected = null;
    updateBadges();
  }

  // Layer1 outside background
  function applyOutsideBg() {
    const c = (config.ui && config.ui.outsideBgColor) ? config.ui.outsideBgColor : "#0b0b10";
    document.body.style.background = c;
  }

  // Context for move/add/delete (layer3)
  function getSelectionContext() {
    if (!selected || !selected.nodeRef) return null;
    if (activeLayer !== "layer3") return null;

    const node = selected.nodeRef;

    if (selected.kind === "block") {
      const blocks = (config.layer3 && config.layer3.blocks) ? config.layer3.blocks : [];
      const idx = blocks.indexOf(node);
      if (idx < 0) return null;
      return { kind: "block", node: node, container: blocks, index: idx };
    }

    if (selected.kind === "col") {
      const m = getMeta(node);
      if (!m || !m.parent || m.parentKind !== "group") return null;
      const container = m.parent.columns || [];
      const idx = container.indexOf(node);
      if (idx < 0) return null;
      return { kind: "col", node: node, container: container, index: idx };
    }

    if (selected.kind === "group") {
      const m = getMeta(node);
      if (!m || !m.parent || m.parentKind !== "block") return null;
      const container = m.parent.children || [];
      const idx = container.indexOf(node);
      if (idx < 0) return null;
      return { kind: "group", node: node, container: container, index: idx };
    }

    if (selected.kind === "text") {
      const m = getMeta(node);
      if (!m || !m.parent) return null;
      const container = m.parent.children || [];
      const idx = container.indexOf(node);
      if (idx < 0) return null;
      return { kind: "text", node: node, container: container, index: idx };
    }

    return null;
  }

  function moveSelectedNode(dir) {
    const ctx = getSelectionContext();
    if (!ctx) return;

    const to = ctx.index + dir;
    if (to < 0 || to >= ctx.container.length) return;

    const tmp = ctx.container[ctx.index];
    ctx.container[ctx.index] = ctx.container[to];
    ctx.container[to] = tmp;

    renderAll();
    setLayerHitTesting(activeLayer);

    const dom = findDomByIdAndKind(tmp.id, ctx.kind);
    if (dom) selectNode({ kind: ctx.kind, nodeRef: tmp, domEl: dom });

    loadDraftFromSelection();
    refreshControls();
    updateToolbarState();
  }

  function deleteSelectedNode() {
    const ctx = getSelectionContext();
    if (!ctx) return;
    if (ctx.kind === "block" && ctx.container.length <= 1) return;

    ctx.container.splice(ctx.index, 1);

    renderAll();
    setLayerHitTesting(activeLayer);

    clearSelection();
    resetDraft();
    refreshControls();
    updateToolbarState();
  }

  function addNodeAfterSelected() {
    if (activeLayer !== "layer3") return;

    const ctx = getSelectionContext();

    if (!ctx) {
      addBlockAtIndex(((config.layer3 && config.layer3.blocks) ? config.layer3.blocks.length : 0));
      return;
    }

    if (ctx.kind === "block") {
      addBlockAtIndex(ctx.index + 1);
      return;
    }

    if (ctx.kind === "col") {
      const used = collectUsedIdsInLayer3();
      const id = uniqueId("col", used);
      const newCol = makeDefaultCol(id);
      ctx.container.splice(ctx.index + 1, 0, newCol);
      attachMeta(newCol, getMeta(ctx.node).parent, "group");

      renderAll();
      setLayerHitTesting(activeLayer);

      const dom = findDomByIdAndKind(newCol.id, "col");
      if (dom) selectNode({ kind: "col", nodeRef: newCol, domEl: dom });

      loadDraftFromSelection();
      refreshControls();
      updateToolbarState();
      return;
    }

    // group or text -> add text sibling
    const used = collectUsedIdsInLayer3();
    const id = uniqueId("t", used);
    const newText = { type: "text", id: id, text: "New line", sizePx: 12, weight: 500, align: "left" };

    ctx.container.splice(ctx.index + 1, 0, newText);
    const m = getMeta(ctx.node);
    attachMeta(newText, m ? m.parent : null, m ? m.parentKind : null);

    renderAll();
    setLayerHitTesting(activeLayer);

    const dom = findDomByIdAndKind(newText.id, "text");
    if (dom) selectNode({ kind: "text", nodeRef: newText, domEl: dom });

    loadDraftFromSelection();
    refreshControls();
    updateToolbarState();
  }

  function addBlockAtIndex(index) {
    if (!config.layer3) config.layer3 = { defaults: {}, blocks: [] };
    if (!config.layer3.blocks) config.layer3.blocks = [];

    const blocks = config.layer3.blocks;
    const newId = uniqueId("block", blocks.map(b => b.id));
    const newBlock = makeDefaultBlock(newId);
    blocks.splice(index, 0, newBlock);

    renderAll();
    setLayerHitTesting(activeLayer);

    const dom = findDomByIdAndKind(newBlock.id, "block");
    if (dom) selectNode({ kind: "block", nodeRef: newBlock, domEl: dom });

    loadDraftFromSelection();
    refreshControls();
    updateToolbarState();
  }

  // Selection helpers (layer3)
  function selectPrevNext(dir) {
    if (activeLayer !== "layer3") return;
    const ctx = getSelectionContext();
    if (!ctx) return;

    const idx = ctx.index + dir;
    if (idx < 0 || idx >= ctx.container.length) return;
    const node = ctx.container[idx];
    const kind = ctx.kind;
    const dom = findDomByIdAndKind(node.id, kind);
    if (dom) {
      selectNode({ kind: kind, nodeRef: node, domEl: dom });
      loadDraftFromSelection();
      refreshControls();
      updateToolbarState();
    }
  }

  function selectParentSmart() {
    if (activeLayer !== "layer3") return;
    if (!selected || !selected.nodeRef) return;

    if (selected.kind === "block") return;

    const b = findContainingBlock(selected.nodeRef);
    if (!b) return;
    const dom = findDomByIdAndKind(b.id, "block");
    if (dom) {
      selectNode({ kind: "block", nodeRef: b, domEl: dom });
      loadDraftFromSelection();
      refreshControls();
      updateToolbarState();
    }
  }

  function selectFirstChildSmart() {
    if (activeLayer !== "layer3") return;
    if (!selected || !selected.nodeRef) return;

    if (selected.kind === "block") {
      const group = findFirstGroupChild(selected.nodeRef);
      if (group && group.columns && group.columns.length) {
        const col = group.columns[0];
        const dom = findDomByIdAndKind(col.id, "col");
        if (dom) selectNode({ kind: "col", nodeRef: col, domEl: dom });
      } else {
        const kids = selected.nodeRef.children || [];
        if (kids.length) {
          const k = kids[0].type === "group" ? "group" : "text";
          const dom = findDomByIdAndKind(kids[0].id, k);
          if (dom) selectNode({ kind: k, nodeRef: kids[0], domEl: dom });
        }
      }
      loadDraftFromSelection();
      refreshControls();
      updateToolbarState();
      return;
    }

    if (selected.kind === "group") {
      const cols = selected.nodeRef.columns || [];
      if (cols.length) {
        const dom = findDomByIdAndKind(cols[0].id, "col");
        if (dom) selectNode({ kind: "col", nodeRef: cols[0], domEl: dom });
      }
      loadDraftFromSelection();
      refreshControls();
      updateToolbarState();
      return;
    }

    if (selected.kind === "col") {
      const kids = selected.nodeRef.children || [];
      if (kids.length) {
        const k = kids[0].type === "group" ? "group" : "text";
        const dom = findDomByIdAndKind(kids[0].id, k);
        if (dom) selectNode({ kind: k, nodeRef: kids[0], domEl: dom });
      }
      loadDraftFromSelection();
      refreshControls();
      updateToolbarState();
      return;
    }
  }

  function findFirstGroupChild(blockNode) {
    const children = blockNode && blockNode.children ? blockNode.children : [];
    for (const c of children) if (c && c.type === "group") return c;
    return null;
  }

  // DOM find
  function findDomByIdAndKind(id, kind) {
    if (!id) return null;
    return document.querySelector('[data-kind="' + kind + '"][data-id="' + cssEscape(id) + '"]');
  }

  // Meta
  function attachMeta(node, parent, parentKind) {
    if (!node || typeof node !== "object") return;
    Object.defineProperty(node, "__meta", {
      value: { parent: parent || null, parentKind: parentKind || null },
      enumerable: false,
      configurable: true
    });
  }
  function getMeta(node) { return node && node.__meta ? node.__meta : null; }

  function isBlockNode(node) {
    const blocks = (config.layer3 && config.layer3.blocks) ? config.layer3.blocks : [];
    return blocks.indexOf(node) >= 0;
  }

  function findContainingBlock(node) {
    let cur = node;
    while (cur) {
      if (isBlockNode(cur)) return cur;
      const m = getMeta(cur);
      cur = m ? m.parent : null;
    }
    return null;
  }

  // Defaults
  function makeDefaultBlock(id) {
    return {
      id: id,
      heightPct: 10,
      widthPct: 100,
      alignX: "center",
      alignY: "center",
      paddingPx: 12,
      backgroundImageUrl: null,
      children: [
        { type: "text", id: id + "_t1", text: "New block", sizePx: 18, weight: 700, align: "center" },
        { type: "text", id: id + "_t2", text: "Edit me", sizePx: 12, weight: 500, align: "center", opacity: 0.9 }
      ]
    };
  }

  function makeDefaultCol(id) {
    return {
      id: id,
      widthPct: null,
      children: [
        { type: "text", id: id + "_t1", text: "New column", sizePx: 14, weight: 700, align: "left" },
        { type: "text", id: id + "_t2", text: "Edit me", sizePx: 12, weight: 500, align: "left", opacity: 0.9 }
      ]
    };
  }

  // IDs
  function collectUsedIdsInLayer3() {
    const used = [];
    const blocks = (config.layer3 && config.layer3.blocks) ? config.layer3.blocks : [];
    for (const b of blocks) {
      if (b.id) used.push(b.id);
      const children = b.children || [];
      for (const c of children) {
        if (c && c.id) used.push(c.id);
        if (c && c.type === "group") {
          const cols = c.columns || [];
          for (const col of cols) {
            if (col && col.id) used.push(col.id);
            const subs = col.children || [];
            for (const s of subs) if (s && s.id) used.push(s.id);
          }
        }
      }
    }
    return used;
  }

  function uniqueId(prefix, usedIds) {
    const set = new Set(usedIds || []);
    let n = 1;
    while (set.has(prefix + n)) n++;
    return prefix + n;
  }

  // Export
  function exportFullJson(copyToClipboard) {
    const out = JSON.stringify(config, null, 2);

    if (copyToClipboard) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(out).then(
          () => alert("Copied JSON to clipboard"),
          () => fallbackCopy(out)
        );
      } else {
        fallbackCopy(out);
      }
      return;
    }

    const blob = new Blob([out], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "page-config.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1200);
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    alert("Copied JSON to clipboard");
  }

  // Utils
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function alignXToCss(a) { return a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center"; }
  function alignYToCss(a) { return a === "top" ? "flex-start" : a === "bottom" ? "flex-end" : "center"; }
  function cssEscape(s) { return String(s).replace(/"/g, '\\"').replace(/\\/g, "\\\\"); }
  function deepClone(x) { return JSON.parse(JSON.stringify(x || {})); }

  function numOrUndef(v) {
    const s = String(v || "").trim();
    if (!s) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  }

  function valOrEmpty(v) {
    return (v === undefined || v === null) ? "" : String(v);
  }

  function toHexOrFallback(color, fallback) {
    if (typeof color === "string" && color.trim().startsWith("#")) return color.trim();
    return fallback;
  }
})();