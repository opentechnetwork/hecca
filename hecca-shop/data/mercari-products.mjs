// General-catalogue stock from the HCSYLVAN Mercari account (user372643498) —
// everything that is NOT archive, so it lives beside data/vintage-products.mjs
// rather than in it.
//
// Source facts (title, brand, price, condition, images, description) were read
// from each item page's Product JSON-LD on 2026-10-19. `source` is kept verbatim
// for provenance and is SOURCE material — it is never published. `blurb` is HECCA
// copy written only from those facts; nothing is inferred, and no claim is made
// that the listing does not support.
//
// Prices match the live Mercari listing. Quantity is 1 (one-of-a-kind resale
// stock) and inventoryPolicy is DENY, the same rule as the archive pieces.

const IMAGES = (id, n) =>
  Array.from({ length: n }, (_, i) => `https://u-mercari-images.mercdn.net/photos/${id}_${i + 1}.jpg`);

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

let seq = 0;
const usedHandles = new Set();

function item(o) {
  seq += 1;

  let handle = slug(o.title);
  while (usedHandles.has(handle)) handle += "-2";
  usedHandles.add(handle);

  const base = o.sourceCondition === "NewCondition" ? "New" : "Pre-owned";
  const specs = [
    ["Size", o.size],
    ["Colour", o.colour],
    ["Condition", o.conditionNote ? `${base} — ${o.conditionNote}` : base],
  ].filter(([, v]) => v);

  return {
    handle,
    title: o.title,
    vendor: "Unbranded",
    brand: o.vendor ?? null,
    status: "DRAFT",
    productType: o.type,
    sku: `HECCA-MRK-${String(seq).padStart(4, "0")}`,
    price: Number(o.price).toFixed(2),
    tags: o.tags,
    seoTitle: `${o.title} — HECCA`,
    seoDescription: o.blurb.replace(/<[^>]+>/g, "").slice(0, 155),
    descriptionHtml:
      `<p>${o.blurb}</p><h4>Details</h4><ul>` +
      specs.map(([k, v]) => `<li><strong>${k}</strong> ${v}</li>`).join("") +
      `</ul><p><em>One available — sourced as single stock.</em></p>`,
    source: o.source,
    images: IMAGES(o.id, o.n).map((src, i) => ({ src, alt: `${o.title} — view ${i + 1}` })),
  };
}

export const MERCARI_PRODUCTS = [
  // ── Apparel › Tops ───────────────────────────────────────────────────────
  item({
    id: "m38429738697", n: 4, title: "Fabletics Muscle Tank", vendor: "Fabletics",
    type: "Tops", price: 12.5, tags: ["apparel:shirts"],
    conditionNote: "never worn, tags still attached",
    blurb: "A muscle tank from Fabletics' International Women's Day release, new with the tags still attached.",
    source: 'Special "international womens day" Muscle tank. New, never worn. Tags still attached. Paid $34.95',
  }),
  item({
    id: "m47124877766", n: 6, title: "White Birch Boutique Top", vendor: "White Birch",
    type: "Tops", price: 11.5, tags: ["apparel:shirts"],
    size: "Small (fits closer to a medium)", colour: "Black", conditionNote: "new without tags",
    blurb: "A silky sleeveless top in black, cut high/low and tied at the nape — worn as a bow or a knot.",
    source: "Silky, sleeveless, high/low black top. Ties around the neck in the back. Can be worn in a bow or knot. Size small but would fit a medium. Brand new without tags",
  }),
  item({
    id: "m88182801191", n: 7, title: "Anthropologie Top", vendor: "Anthropologie",
    type: "Tops", price: 10, tags: ["apparel:shirts"],
    size: "Large", colour: "Black",
    blurb: "A black top from Anthropologie.",
    source: "Black Anthropologie Top size large",
  }),
  item({
    id: "m84063640337", n: 3, title: "Express Top", vendor: "Express",
    type: "Tops", price: 12, tags: ["apparel:shirts"],
    size: "XL", colour: "Black",
    blurb: "A black top from Express.",
    source: "Womens Black Express Size XL.",
  }),
  item({
    id: "m86976883278", n: 6, title: "Pebby Forevee Chain Tank", vendor: "Pebby Forevee",
    type: "Tops", price: 28, tags: ["apparel:shirts"],
    size: "L/XL", colour: "Bone", conditionNote: "new, never worn",
    blurb: "A 'boyfriend' tank from Pebby Forevee in bone with a chain detail, made to be worn several ways.",
    source: 'Pebby Forevee "boyfriend tank" can be worn multiple ways. Color bone with chain.  Brand new, never worn. Size L/XL',
  }),
  item({
    id: "m61149235754", n: 5, title: "Nike Workout Tank", vendor: "Nike",
    type: "Tops", price: 12, tags: ["apparel:shirts"],
    size: "XL", colour: "Light blue-grey",
    blurb: "A light blue-grey workout tank from Nike.",
    source: "Womens size XL workout tank. Light blue/gray.",
  }),
  item({
    id: "m84728075437", n: 3, title: "Buckle Striped Tie-Front Tunic", vendor: "Buckle",
    type: "Tops", price: 12, tags: ["apparel:shirts"],
    colour: "Black and white", conditionNote: "worn once",
    blurb: "A black and white striped tunic top with a tie front, from The Buckle.",
    source: "Black and White. Purchased from The Buckle. Worn once.",
  }),
  item({
    id: "m64730321512", n: 5, title: "Bourbon & Belles Skull Baby Tee", vendor: "Bourbon & Belles",
    type: "Tops", price: 18.5, tags: ["apparel:shirts"],
    colour: "Orange", conditionNote: "new without tags, never worn",
    blurb: "An orange cropped baby tee with a skull design, from Bourbon & Belles. It runs small.",
    source: "Orange cropped baby tee. Skull design. Runs small. Brand new. Not tags. Never worn.",
  }),
  item({
    id: "m89632304778", n: 5, title: "Boutique Hook-Front Top", vendor: "Unbranded",
    type: "Tops", price: 19, tags: ["apparel:shirts"],
    colour: "Vista Teal",
    blurb: "A hook-front top in Vista Teal, with multiple hooks down the front.",
    source: "Color is called: Vista Teal. Multiple Hooks in front, very flattering.",
  }),

  // ── Apparel › Bottoms ────────────────────────────────────────────────────
  item({
    id: "m83556370060", n: 4, title: "Year of Ours Drawstring Sweatpants", vendor: "Year of Ours",
    type: "Bottoms", price: 13, tags: ["apparel:bottoms"],
    size: "M/L", colour: "Light blue", conditionNote: "worn once",
    blurb: "Light blue drawstring sweatpants from Year of Ours, in a thick, substantial knit.",
    source: 'This came in my fabfitfun box and only worn once and unfortunately they are a little too big. Light blue. Brand is "Year of Ours." Super thick well made pants. Size M/L',
  }),
  item({
    id: "m39149878079", n: 4, title: "Nine West Straight-Leg Jeans", vendor: "Nine West",
    type: "Bottoms", price: 17.25, tags: ["apparel:bottoms"],
    size: "12", colour: "Light denim",
    blurb: "Straight-leg jeans in light denim from Nine West.",
    source: "Straight leg. Light denim. Size 12. Originally from Kohls",
  }),
  item({
    id: "m92282297375", n: 3, title: "Mossimo Mid-Rise Jegging", vendor: "Mossimo",
    type: "Bottoms", price: 9, tags: ["apparel:bottoms"],
    size: "12",
    blurb: "A mid-rise power-stretch jegging from Mossimo.",
    source: "Mid rise jegging. Size 12. Power stretch",
  }),
  item({
    id: "m94089965834", n: 6, title: "Hudson Collin Skinny Jeans", vendor: "Hudson Jeans",
    type: "Bottoms", price: 31.72, tags: ["apparel:bottoms"],
    size: "31 x 32", conditionNote: "worn a few times",
    blurb: "Collin mid-rise skinny jeans from Hudson, originally from Saks.",
    source: "Collin mid rise skinny jean. Size 31x32. Worn a few times. Original price from Saks was $215",
  }),
  item({
    id: "m79526530614", n: 6, title: "Forest Cream Denim Jeans", vendor: "Forest",
    type: "Bottoms", price: 15, tags: ["apparel:bottoms"],
    size: "Medium, 28 in inseam", colour: "Cream/white",
    blurb: "Cream denim jeans from Forest.",
    source: "Boutique brand Forest denim jeans. Cream/white. Inseam is 28in size med",
  }),

  // ── Apparel › Shorts ─────────────────────────────────────────────────────
  item({
    id: "m38875029247", n: 4, title: "Calvin Klein Biker Shorts", vendor: "Calvin Klein",
    type: "Shorts", price: 10.25, tags: ["apparel:shorts"],
    size: "XL", conditionNote: "new, never worn",
    blurb: "Calvin Klein biker shorts in a fashion print.",
    source: "New, never worn. Calvin Klein fashion print biker shorts.  Size Xl",
  }),
  item({
    id: "m36454636639", n: 3, title: "Under Armour Athletic Shorts", vendor: "Under Armour",
    type: "Shorts", price: 9.02, tags: ["apparel:shorts"],
    size: "Large (cut on the small side)", colour: "Grey and white",
    blurb: "Grey and white athletic shorts from Under Armour.",
    source: "Gray and white shorts. Size large but looks like they run a little small. Very good quality",
  }),
  item({
    id: "m98640701131", n: 6, title: "Peach Love California Shorts", vendor: "Peach Love California",
    type: "Shorts", price: 16, tags: ["apparel:shorts"],
    colour: "Blush, peach and brown", conditionNote: "new without tags",
    blurb: "Two-toned boutique shorts with a stretch waistband and gem detail at the pockets and hem, double lined so they are not see-through.",
    source: "Two Toned shorts. Double lined inside, not see through. Stretchy waistband, gem detail on pockets and bottom. Not sure what to call the color: pink,peach,brownish and the pockets darker. Super cute and comfy. Brand new without tags.",
  }),
  item({
    id: "m46124724303", n: 3, title: "Venus Distressed Shorts", vendor: "Venus",
    type: "Shorts", price: 13, tags: ["apparel:shorts"],
    size: "14 (fits closer to a 12)",
    blurb: "Distressed denim shorts from Venus in a super-stretch fabric.",
    source: "Venus distressed shorts. Super stretchy. Size 14 but could fit a 12.",
  }),

  // ── Apparel › Dresses, Outerwear, Shoes, Lingerie, Shirts ────────────────
  item({
    id: "m19619237410", n: 5, title: "Dillard's Floral Wrap Dress", vendor: "Dillard's",
    type: "Dresses", price: 15, tags: ["apparel:dresses"],
    colour: "Blue with pink and purple floral", conditionNote: "never worn",
    blurb: "A wrap dress in blue with a pink and purple floral print, from Dillard's.",
    source: "Blue with pink and purple flower wrap dress. Very flattering design. Never worn. Purchased from Dillard's.",
  }),
  item({
    id: "m32767524080", n: 6, title: "Suede-Look Zip Jacket", vendor: "Macy's",
    type: "Outerwear", price: 17, tags: ["apparel:outerwear"],
    colour: "Red",
    blurb: "A red suede-look jacket with front zips and a notch lapel.",
    source: "Red suede look jacket. Front zippers. Notch lapel.",
  }),
  item({
    id: "m34635699327", n: 4, title: "Nike Sneakers", vendor: "Nike",
    type: "Shoes", price: 19, tags: ["apparel:shoes"],
    size: "9", colour: "Grey and pink",
    blurb: "Nike women's sneakers in grey and pink.",
    source: "Gray and pink Nike womens sneakers size 9",
  }),
  item({
    id: "m48628519946", n: 4, title: "Adore Me Lace Bra", vendor: "Adore Me",
    type: "Lingerie", price: 15, tags: ["apparel:lingerie"],
    size: "36DDD", colour: "Black",
    blurb: "A black bra with lace detail from Adore Me. Please note the removable padding for the inner cups is not included.",
    source: "Black, lace detail. Size 36DDD. Does not include removable padding on inside cups.",
  }),
  item({
    id: "m38574293076", n: 4, title: "SHEIN Sleeveless Blouse", vendor: "SHEIN",
    type: "Shirts", price: 10, tags: ["apparel:shirts"],
    size: "XL", conditionNote: "never worn",
    blurb: "A sleeveless blouse from SHEIN.",
    source: "Shein. Size xl. Never worn. Sleeveless blouse",
  }),

  // ── Jewelry › Earrings ───────────────────────────────────────────────────
  item({
    id: "m19443241885", n: 3, title: "Crystal Haze Serena Hoop Earrings", vendor: "Crystal Haze",
    type: "Earrings", price: 12, tags: ["jewelry:earrings"],
    conditionNote: "new",
    blurb: "Mini Serena hoops from Crystal Haze — silver plated with cubic zirconia.",
    source: "Mini Serena hoops. Silver plated. Diamond Cz.",
  }),
  item({
    id: "m47938692303", n: 2, title: "Handmade Red Bead Heart Earrings", vendor: "Unbranded",
    type: "Earrings", price: 7, tags: ["jewelry:earrings"],
    blurb: "Red beaded heart earrings, handmade.",
    source: "Red beaded heart earrings. Handmade.",
  }),
  item({
    id: "m63815874385", n: 2, title: "Red Jewel Earrings", vendor: "Unbranded",
    type: "Earrings", price: 22, tags: ["jewelry:earrings"],
    blurb: "Red jewel earrings, 3.75 in long.",
    source: "Red jewel earrings 3.75 inches. Gorgeous",
  }),
  item({
    id: "m58519448676", n: 1, title: "Chandelier Earrings with Black Beads", vendor: "Unbranded",
    type: "Earrings", price: 13, tags: ["jewelry:earrings"],
    blurb: "Post-back chandelier earrings with black beads, approximately 3.25 in from top to bottom.",
    source: "Post back Vintage Chandelier Earrings. Approximately 3.25 inches from top to bottom.",
  }),
  item({
    id: "m28681954806", n: 1, title: "Handmade Beaded Heart Earrings", vendor: "Unbranded",
    type: "Earrings", price: 8.25, tags: ["jewelry:earrings"],
    blurb: "Red beaded heart earrings, handmade.",
    source: "Red beaded heart handmade earrings.",
  }),
  item({
    id: "m41577213021", n: 3, title: "Hand-Painted Floral Earrings", vendor: "Unbranded",
    type: "Earrings", price: 14, tags: ["jewelry:earrings"],
    blurb: "Hand-painted earrings with a floral design.",
    source: "Hand painted earrings. Beautiful flowers",
  }),
  item({
    id: "m68396251927", n: 4, title: "Pink AB Crystal Heart Earrings", vendor: "Unbranded",
    type: "Earrings", price: 17, tags: ["jewelry:earrings"],
    colour: "Pink", conditionNote: "never worn",
    blurb: "Heart-shaped pink AB crystal dangle earrings on a post back, light to wear.",
    source: "Heart shaped pink AB crystal dangle earrings. Not super heavy. Post back. Stunning in person. Never worn.",
  }),

  // ── Jewelry › Bracelets, Necklaces, Rings, Charms ────────────────────────
  item({
    id: "m57276437125", n: 3, title: "Rustic Cuff Bracelet, Red & White", vendor: "Rustic Cuff",
    type: "Bracelets", price: 12, tags: ["jewelry:bracelets"],
    colour: "Red and white with gold",
    blurb: "An adjustable bracelet in red and white with gold from Rustic Cuff, 8 in long. Comes with its pouch.",
    source: "Red and white with gold. Adjustable strap. comes with pouch. 8in",
  }),
  item({
    id: "m99007173736", n: 2, title: "Leather & Red Stone Bracelet", vendor: "Unbranded",
    type: "Bracelets", price: 13, tags: ["jewelry:bracelets"],
    blurb: "A leather bracelet set with red stones, on an adjustable strap 9.75 in long.",
    source: "Leather Bracelet with Red stones. Adjustable strap 9.75 in long.",
  }),
  item({
    id: "m18868386643", n: 4, title: "Rustic Cuff Bracelet, Hot Pink", vendor: "Rustic Cuff",
    type: "Bracelets", price: 17, tags: ["jewelry:bracelets"],
    colour: "Hot pink and silver",
    blurb: "An adjustable bracelet in hot pink and silver from Rustic Cuff. Comes with its pouch.",
    source: "Hot pink and silver adjustable bracelet. Comes with pouch.",
  }),
  item({
    id: "m61957691789", n: 3, title: "Crescent Moon & Star Necklace", vendor: "Unbranded",
    type: "Necklaces", price: 18.5, tags: ["jewelry:necklaces"],
    colour: "Gold",
    blurb: "A delicate gold chain with a pendant shaped as a crescent moon and star.",
    source: "Delicate gold chain necklace featuring a pendant shaped like a crescent moon and star.",
  }),
  item({
    id: "m97892960552", n: 3, title: "Multi-Colour Chain Necklace", vendor: "Unbranded",
    type: "Necklaces", price: 12.25, tags: ["jewelry:necklaces"],
    blurb: "A long multi-colour chain necklace, approximately 16 in with a 3 in extender.",
    source: "Long chain necklace. Approximately 16 inches with 3 inch extender.",
  }),
  item({
    id: "m68052149914", n: 6, title: "Green Stone Ring", vendor: "Unbranded",
    type: "Rings", price: 13, tags: ["jewelry:rings"],
    size: "7", colour: "Silver with green stone",
    blurb: "A silver ring set with an oval green stone.",
    source: "Silver with green stone oval shaped. Size 7",
  }),
  item({
    id: "m68976506869", n: 1, title: "Heart Charms, Set of Four", vendor: "Unbranded",
    type: "Charms", price: 10, tags: ["jewelry:charms"],
    blurb: "Four heart charms, for a bracelet or a necklace.",
    source: "4 heart charms for bracelet or necklace",
  }),

  // ── Accessories › Hats, Hair ─────────────────────────────────────────────
  item({
    id: "m13725526283", n: 4, title: "Victoria's Secret PINK Cap", vendor: "Victoria's Secret PINK",
    type: "Hats", price: 17.59, tags: ["accessories:hats"],
    size: "One size", colour: "Black",
    blurb: "An adjustable one-size cap in black from Victoria's Secret PINK, with an American flag dog patch at the front and PINK at the back.",
    source: "One size, black, adjustable hat. American flag dog on front, PINK on back.",
  }),
  item({
    id: "m99558821241", n: 5, title: "Jewel-Detail Headband", vendor: "Unbranded",
    type: "Hair", price: 10, tags: ["accessories:hair"],
    colour: "White", conditionNote: "never worn",
    blurb: "A white headband with jewel detailing.",
    source: "White with jewel detail. Never worn. Super cute and trendy.",
  }),
  item({
    id: "m77847347169", n: 1, title: "Rustic Cuff Hair Ties, Set of Two", vendor: "Rustic Cuff",
    type: "Hair", price: 9.25, tags: ["accessories:hair"],
    colour: "Red patterns",
    blurb: "Two Rustic Cuff hair ties in red patterns.",
    source: "Rustic Cuff Hair Ties. Qty 2 Red patterns",
  }),

  // ── Beauty ───────────────────────────────────────────────────────────────
  item({
    id: "m81447179271", n: 3, title: "Laneige Lip Sleeping Mask, Berry", vendor: "Laneige",
    type: "Skincare", price: 12.5, tags: ["beauty:skincare"],
    conditionNote: "product unused, box opened",
    blurb: "Laneige Lip Sleeping Mask in Berry, travel size (3 g). The box has been opened; the product itself is unused.",
    source: "Travel Size. 0.10oz/3g. In Berry. Opened box however this is new, never used",
  }),
  item({
    id: "m12096305381", n: 2, title: "Lancôme La Vie Est Belle Lotion & Samples", vendor: "Lancôme",
    type: "Skincare", price: 14, tags: ["beauty:skincare"],
    blurb: "La Vie Est Belle fragrance body lotion (50 ml) with two Idôle Peach 'n Roses perfume sample sprays.",
    source: "La vie est belle fragrance body lotion 50ml 1.6fl oz 2 Idole peach n roses perfume samples spray.",
  }),
  item({
    id: "m56305497123", n: 2, title: "Lancôme Tonique Confort Toner", vendor: "Lancôme",
    type: "Skincare", price: 14, tags: ["beauty:skincare"],
    conditionNote: "used once",
    blurb: "Tonique Confort re-hydrating comforting toner from Lancôme, 4.2 fl oz.",
    source: "Tonique Confort. Re-Hydrating Comforting Toner. 4.2 fl oz. Only used once",
  }),
  item({
    id: "m77242074439", n: 3, title: "Bushbalm Watermelon Sugar Scrub", vendor: "Bushbalm",
    type: "Skincare", price: 14.25, tags: ["beauty:skincare"],
    conditionNote: "new in box, seal intact",
    blurb: "Bushbalm ingrown-hair exfoliating scrub, 236 ml, in Watermelon Sugar. New in box with the seal intact.",
    source: "Ingrown hair exfoliating scrub 236ml/8fl oz. Scent: watermelon sugar. New in box and seal intact.",
  }),
  item({
    id: "m35339891875", n: 3, title: "Nails Inc Crystal Ball Gloss Duo", vendor: "Nails Inc",
    type: "Makeup", price: 12.25, tags: ["beauty:makeup"],
    blurb: "Crystal Ball Rollergloss Duo from Nails Inc — two 7 ml glosses.",
    source: "Crystal Ball Rollergloss Duo. Nails inc 2x7ml/0.24fl. Oz",
  }),
  item({
    id: "m37174969929", n: 3, title: "Dominique Cosmetics Blur & Moisture Primer", vendor: "Dominique Cosmetics",
    type: "Makeup", price: 19, tags: ["beauty:makeup"],
    conditionNote: "new, box opened to photograph",
    blurb: "Blur and Moisture serum primer from Dominique Cosmetics, 30 ml. The box was opened to photograph the product; it is new and unused.",
    source: "Blur and moisture serum primer. 30ml/10fl oz Opened box to take a picture of the product. Brand new, never used.",
  }),
  item({
    id: "m59271494484", n: 4, title: "Eloise Mini Teardrop Brush", vendor: "Eloise",
    type: "Tools", price: 14, tags: ["beauty:tools"],
    colour: "Rose gold",
    blurb: "Eloise Mini Teardrop make-up brush in a rose-gold mirror finish.",
    source: "Rose Gold Mirror Finish Make up Brush",
  }),
];
