// data2.js
// Put ONLY data here. The renderer reads window.PAGE_CONFIG.
window.PAGE_CONFIG = {
  meta: { title: "Sandwiches", format: "A4" },
  editor: { secret: "letmein" },
  ui: { outsideBgColor: "#0b0b10" },

  layer1: {
    backgroundImageUrl: "assets/background.png",
    backgroundPosition: "center",
    backgroundSize: "cover",
    overlay: null
  },

  layer2: {
    pictures: [
      {
        id: "logoPlaque",
        url: "assets/logo.png",
        xPct: 50,
        yPct: 6.4,
        wPct: 28,
        align: "center",
        opacity: 1,
        rotationDeg: 0,
        style: {
          backdrop: { enabled: true, color: "rgba(255,255,255,0.45)", blurPx: 6 },
          radiusPx: 14,
          shadow: "0 10px 22px rgba(0,0,0,0.18)"
        }
      },

      { id: "heroLeft",  url: "assets/pic1.png", xPct: 5.3,  yPct: 15.1, wPct: 29.8, align: "left",  opacity: 1, rotationDeg: 0, style: { radiusPx: 14, shadow: "0 10px 22px rgba(0,0,0,0.20)" } },
      { id: "heroMid",   url: "assets/pic2.png", xPct: 50.0, yPct: 15.1, wPct: 29.8, align: "center",opacity: 1, rotationDeg: 0, style: { radiusPx: 14, shadow: "0 10px 22px rgba(0,0,0,0.20)" } },
      { id: "heroRight", url: "assets/pic3.png", xPct: 94.7, yPct: 15.1, wPct: 29.8, align: "right", opacity: 1, rotationDeg: 0, style: { radiusPx: 14, shadow: "0 10px 22px rgba(0,0,0,0.20)" } },

      { id: "bottomLeftPic",  url: "assets/pic2.png", xPct: 6.0,  yPct: 79.3, wPct: 28.5, align: "left",  opacity: 1, rotationDeg: 0, style: { radiusPx: 14, shadow: "0 10px 22px rgba(0,0,0,0.20)" } },
      { id: "bottomRightPic", url: "assets/pic3.png", xPct: 94.0, yPct: 79.3, wPct: 28.5, align: "right", opacity: 1, rotationDeg: 0, style: { radiusPx: 14, shadow: "0 10px 22px rgba(0,0,0,0.20)" } }
    ]
  },

  layer3: {
    defaults: { fontFamily: "Georgia, 'Times New Roman', serif", color: "#2d2a25" },
    blocks: [
      {
        id: "topTitle",
        heightPct: 12.8,
        widthPct: 100,
        alignX: "center",
        alignY: "center",
        paddingPx: 8,
        children: [
          {
            type: "text",
            id: "title",
            text: "Sandwiches",
            sizePx: 50,
            weight: 800,
            align: "center",
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "#2b4f63"
          }
        ]
      },
      { id: "heroRowSpace", heightPct: 33.0, widthPct: 100, paddingPx: 0, children: [] },

      {
        id: "menuTwoCol",
        heightPct: 31.8,
        widthPct: 100,
        alignX: "center",
        alignY: "center",
        paddingPx: 18,
        children: [
          {
            type: "group",
            id: "menuCols",
            columns: [
              {
                id: "left",
                widthPct: 50,
                children: [
                  { type: "text", id: "l1name", text: "Chicken Pecan  (N)", sizePx: 20, weight: 800, color: "#2b4f63" },
                  { type: "text", id: "l1desc", text: "Chicken salad with pecans and golden raisins /\nmixed greens / fresh croissant.", sizePx: 12.8, weight: 500, opacity: 0.92, color: "#3b362f" },

                  { type: "text", id: "l2name", text: "Grilled Chicken Pesto", sizePx: 20, weight: 800, color: "#2b4f63" },
                  { type: "text", id: "l2desc", text: "Pesto aioli / roasted red bell peppers / mixed\ngreens / lemon oregano dressing / grilled ciabatta.", sizePx: 12.8, weight: 500, opacity: 0.92, color: "#3b362f" },

                  { type: "text", id: "l3name", text: "Southwest Sonora Chicken Wrap  (D)", sizePx: 20, weight: 800, color: "#2b4f63" },
                  { type: "text", id: "l3desc", text: "Black beans / corn relish / mixed greens /\ntomatoes / cheddar / Asiago / ancho lime aioli /\nwrap.", sizePx: 12.8, weight: 500, opacity: 0.92, color: "#3b362f" },

                  { type: "text", id: "l4name", text: "Grilled Salmon  (N)", sizePx: 20, weight: 800, color: "#2b4f63" },
                  { type: "text", id: "l4desc", text: "Baby kale & endive leaves / julienne tomatoes /\ncucumbers / red onions / roasted pecans / lemon\nbasil vinaigrette.", sizePx: 12.8, weight: 500, opacity: 0.92, color: "#3b362f" }
                ]
              },
              {
                id: "right",
                widthPct: 50,
                children: [
                  { type: "text", id: "r1name", text: "Turkey Club Sandwich  (D)", sizePx: 20, weight: 800, color: "#2b4f63" },
                  { type: "text", id: "r1desc", text: "Olive herb aioli / crisp bacon / tomato / Swiss\ncheese / mixed greens / whole wheat bread.", sizePx: 12.8, weight: 500, opacity: 0.92, color: "#3b362f" },

                  { type: "text", id: "r2name", text: "Caprese Fresca  (VGTN)", sizePx: 20, weight: 800, color: "#2b4f63" },
                  { type: "text", id: "r2desc", text: "Fresh mozzarella / basil / tomato / mixed greens /\nlemon oregano dressing.", sizePx: 12.8, weight: 500, opacity: 0.92, color: "#3b362f" },

                  { type: "text", id: "r3name", text: "California Vegi  (D)  (VGTN)", sizePx: 20, weight: 800, color: "#2b4f63" },
                  { type: "text", id: "r3desc", text: "Havarti / grape tomatoes / roasted red peppers /\ngrilled onions / mushrooms / arugula / wrap.", sizePx: 12.8, weight: 500, opacity: 0.92, color: "#3b362f" },

                  { type: "text", id: "r4name", text: "Add Another Sandwich  (V)  (GF)  (SOY)", sizePx: 20, weight: 800, color: "#2b4f63" },
                  { type: "text", id: "r4desc", text: "Replace this placeholder with your next item\n(supports 8+ items easily).", sizePx: 12.8, weight: 500, opacity: 0.92, color: "#3b362f" }
                ]
              }
            ]
          }
        ]
      },

      {
        id: "legendRow",
        heightPct: 6.4,
        widthPct: 100,
        alignX: "center",
        alignY: "center",
        paddingPx: 6,
        children: [
          { type: "text", id: "legend", text: "V = Vegan    VGTN = Vegetarian    GF = Gluten Free    D = Contains Dairy    N = Contains Nuts    SOY = Contains Soy", sizePx: 11, weight: 600, align: "center", opacity: 0.78, color: "#4a4640" }
        ]
      },

      {
        id: "bottomBand",
        heightPct: 16.0,
        widthPct: 100,
        alignX: "center",
        alignY: "center",
        paddingPx: 12,
        children: [
          {
            type: "group",
            id: "bottomGrid",
            columns: [
              { id: "leftSlot", widthPct: 33.33, children: [] },
              {
                id: "centerPromo",
                widthPct: 33.33,
                children: [
                  { type: "text", id: "fresh", text: "Fresh & Delicious", sizePx: 34, weight: 600, align: "center", fontFamily: "'Brush Script MT', 'Snell Roundhand', cursive", color: "#2b4f63", opacity: 0.95 },
                  { type: "text", id: "tagline", text: "CATERING  FOR  ANY\nOCCASION", sizePx: 13.5, weight: 800, align: "center", color: "#4a4640", opacity: 0.86 }
                ]
              },
              { id: "rightSlot", widthPct: 33.33, children: [] }
            ]
          }
        ]
      }
    ]
  }
};