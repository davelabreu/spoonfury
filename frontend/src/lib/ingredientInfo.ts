/** Lightweight ingredient tips — shown on hover in the recipe checklist. */

interface IngredientTip {
  description: string;
  tip?: string;       // cooking/selection tip
  nutrition?: string;  // brief health note
}

const INFO_MAP: Array<[RegExp, IngredientTip]> = [
  // Vegetables
  [/carrot/i,           { description: "Root vegetable, sweet and earthy", nutrition: "High in vitamin A and beta-carotene", tip: "Look for firm, bright orange roots" }],
  [/corn|maize/i,       { description: "Sweet starchy grain", nutrition: "Good source of fiber and B vitamins", tip: "Fresh ears should have green, tight husks" }],
  [/broccoli/i,         { description: "Cruciferous green vegetable", nutrition: "Rich in vitamin C, vitamin K, and fiber", tip: "Florets should be dark green, not yellowing" }],
  [/\bonion/i,          { description: "Aromatic bulb, base of most cooking", nutrition: "Contains quercetin and antioxidants", tip: "Store in a cool, dry place — not the fridge" }],
  [/garlic/i,           { description: "Pungent aromatic bulb", nutrition: "Natural antimicrobial, supports heart health", tip: "Mince and let sit 10 min before cooking for max allicin" }],
  [/potato|yam/i,       { description: "Starchy root vegetable", nutrition: "Good source of potassium and vitamin C", tip: "Avoid potatoes with green spots (solanine)" }],
  [/sweet potato/i,     { description: "Sweet starchy root", nutrition: "Packed with vitamin A and fiber", tip: "Roasting brings out natural sweetness" }],
  [/tomato/i,           { description: "Juicy fruit used as vegetable", nutrition: "Rich in lycopene and vitamin C", tip: "Store at room temp — fridge kills flavor" }],
  [/eggplant|aubergine/i, { description: "Meaty nightshade vegetable", nutrition: "Low calorie, contains nasunin antioxidant", tip: "Salt and drain to remove bitterness" }],
  [/avocado/i,          { description: "Creamy, rich fruit", nutrition: "Healthy monounsaturated fats, potassium", tip: "Ripe when it yields to gentle pressure" }],
  [/lettuce/i,          { description: "Crisp salad green", nutrition: "Low calorie, provides folate and vitamin K" }],
  [/spinach/i,          { description: "Leafy green, mild flavor", nutrition: "Iron, vitamin K, folate powerhouse", tip: "Cook briefly to reduce oxalic acid" }],
  [/kale/i,             { description: "Hearty leafy green", nutrition: "Dense in vitamins A, C, K and calcium", tip: "Massage raw kale with oil to soften" }],
  [/cabbage/i,          { description: "Crunchy cruciferous vegetable", nutrition: "High in vitamin C and fiber" }],
  [/cucumber/i,         { description: "Cool, crisp vegetable", nutrition: "Hydrating — 95% water, contains vitamin K" }],
  [/zucchini|courgette/i, { description: "Mild summer squash", nutrition: "Low calorie, good source of vitamin B6" }],
  [/pepper|capsicum/i,  { description: "Sweet or hot bell/chili pepper", nutrition: "Excellent source of vitamin C", tip: "Red peppers have 3x more vitamin C than green" }],
  [/chili|chilli/i,     { description: "Hot pepper, various heat levels", nutrition: "Capsaicin may boost metabolism", tip: "Remove seeds and ribs to reduce heat" }],
  [/mushroom/i,         { description: "Earthy fungi, many varieties", nutrition: "One of few natural vitamin D sources", tip: "Don't wash — wipe with a damp cloth" }],
  [/celery/i,           { description: "Crunchy stalk vegetable", nutrition: "Very low calorie, good source of vitamin K" }],
  [/asparagus/i,        { description: "Tender spring vegetable", nutrition: "Rich in folate and vitamins A, C, K", tip: "Snap the woody ends — they break naturally" }],
  [/pea|snap pea/i,     { description: "Sweet green legume", nutrition: "Good plant protein, vitamins A and C" }],
  [/green bean/i,       { description: "Tender string bean", nutrition: "Good source of fiber, vitamins C and K" }],
  [/bean|lentil|chickpea|legume/i, { description: "Protein-rich legume", nutrition: "Excellent plant protein, iron, and fiber", tip: "Rinse canned beans to reduce sodium by 40%" }],
  [/pumpkin|squash|butternut/i, { description: "Sweet winter squash", nutrition: "High in vitamin A and fiber", tip: "Roast cut-side down for caramelization" }],

  // Fruit
  [/lemon/i,            { description: "Tart citrus fruit", nutrition: "Very high in vitamin C", tip: "Roll on counter before juicing for more juice" }],
  [/lime/i,             { description: "Sharp citrus fruit", nutrition: "Good vitamin C source", tip: "Microwave 10 sec for easier juicing" }],
  [/apple/i,            { description: "Crisp, sweet-tart fruit", nutrition: "Fiber and vitamin C, eat the skin", tip: "Granny Smith for cooking, Honeycrisp for eating" }],
  [/orange|mandarin|clementine/i, { description: "Sweet citrus fruit", nutrition: "Excellent vitamin C, folate source" }],
  [/grape/i,            { description: "Small sweet fruit, many varieties", nutrition: "Contains resveratrol antioxidant" }],
  [/strawberr/i,        { description: "Sweet red berry", nutrition: "More vitamin C than oranges per serving" }],
  [/banana/i,           { description: "Sweet tropical fruit", nutrition: "Great source of potassium and B6", tip: "Freeze overripe bananas for smoothies" }],
  [/blueberr/i,         { description: "Small antioxidant-rich berry", nutrition: "Among highest antioxidant foods" }],
  [/mango/i,            { description: "Sweet tropical stone fruit", nutrition: "Rich in vitamins A and C" }],
  [/pineapple/i,        { description: "Tropical fruit, sweet and tangy", nutrition: "Contains bromelain enzyme, aids digestion" }],
  [/coconut/i,          { description: "Tropical drupe with rich flesh", nutrition: "High in healthy MCT fats", tip: "Coconut oil is solid below 76°F" }],

  // Meat & Seafood
  [/chicken/i,          { description: "Versatile lean poultry", nutrition: "High protein, low fat (breast)", tip: "Internal temp: 165°F / 74°C" }],
  [/turkey/i,           { description: "Lean poultry meat", nutrition: "High protein, rich in B vitamins", tip: "Internal temp: 165°F / 74°C" }],
  [/beef|steak|ribeye|sirloin|tenderloin|brisket/i, { description: "Red meat, various cuts", nutrition: "High in protein, iron, B12, zinc", tip: "Rest meat 5-10 min after cooking" }],
  [/pork|ham/i,         { description: "Versatile white meat", nutrition: "Good protein, thiamine source", tip: "Internal temp: 145°F / 63°C + 3 min rest" }],
  [/lamb|mutton/i,      { description: "Rich, slightly gamey red meat", nutrition: "High in protein, iron, zinc, B12" }],
  [/bacon/i,            { description: "Cured, smoked pork belly", nutrition: "High sodium and saturated fat — use in moderation", tip: "Bake at 400°F for even, hands-free cooking" }],
  [/sausage|chorizo/i,  { description: "Seasoned ground meat in casing", nutrition: "Protein-rich, often high sodium" }],
  [/salmon/i,           { description: "Rich, oily pink fish", nutrition: "Excellent omega-3 fatty acids, vitamin D", tip: "Wild-caught has more omega-3 than farmed" }],
  [/tuna/i,             { description: "Meaty ocean fish", nutrition: "High protein, omega-3s, vitamin D", tip: "Limit to 2-3 servings/week (mercury)" }],
  [/cod|halibut|tilapia/i, { description: "Mild white fish", nutrition: "Lean protein, low in fat" }],
  [/shrimp|prawn/i,     { description: "Sweet, delicate shellfish", nutrition: "High protein, low calorie, iodine source", tip: "Don't overcook — they curl into a C when done" }],

  // Dairy & Eggs
  [/egg/i,              { description: "Versatile protein source", nutrition: "Complete protein, choline, vitamin D", tip: "Room temp eggs whip better for baking" }],
  [/cheese|parmesan|mozzarella|cheddar|feta/i, { description: "Fermented dairy product", nutrition: "Calcium and protein, varies by type", tip: "Bring to room temp before serving for best flavor" }],
  [/butter/i,           { description: "Churned cream fat", nutrition: "Fat-soluble vitamins A, D, E", tip: "Brown butter for nutty depth of flavor" }],
  [/milk/i,             { description: "Dairy liquid", nutrition: "Calcium, vitamin D, protein", tip: "Whole milk makes creamier sauces" }],
  [/cream/i,            { description: "Rich dairy fat", nutrition: "High in saturated fat and vitamin A" }],
  [/yogurt|yoghurt/i,   { description: "Fermented dairy", nutrition: "Probiotics, calcium, protein", tip: "Greek yogurt has 2x the protein of regular" }],

  // Bread & Grains
  [/bread/i,            { description: "Baked grain staple", nutrition: "Whole grain has more fiber and nutrients" }],
  [/pasta|spaghetti|penne|linguine|fettuccine/i, { description: "Italian wheat noodles", nutrition: "Complex carbs for sustained energy", tip: "Salt the water generously — it's your only chance to season the pasta" }],
  [/rice/i,             { description: "Staple grain, many varieties", nutrition: "Brown rice has more fiber than white", tip: "Rinse until water runs clear for fluffier results" }],
  [/flour/i,            { description: "Milled grain powder", nutrition: "Whole wheat has more fiber and nutrients", tip: "Spoon into measuring cup — don't scoop" }],
  [/oat/i,              { description: "Hearty whole grain", nutrition: "Beta-glucan fiber supports heart health" }],
  [/noodle/i,           { description: "Various flour-based noodles", nutrition: "Carbohydrate energy source" }],

  // Herbs & Spices
  [/basil/i,            { description: "Sweet aromatic herb", nutrition: "Anti-inflammatory, vitamin K", tip: "Add at the end of cooking to preserve flavor" }],
  [/cilantro|coriander/i, { description: "Bright herb (or ground seed)", nutrition: "Contains antioxidants and vitamins A, K", tip: "Some people taste soap — genetic variation" }],
  [/parsley/i,          { description: "Fresh mild herb", nutrition: "Very high in vitamin K and C" }],
  [/ginger/i,           { description: "Spicy, warm root", nutrition: "Anti-nausea, anti-inflammatory", tip: "Freeze whole ginger and grate from frozen" }],
  [/cinnamon/i,         { description: "Warm, sweet bark spice", nutrition: "May help regulate blood sugar" }],
  [/turmeric/i,         { description: "Golden anti-inflammatory spice", nutrition: "Curcumin is a potent antioxidant", tip: "Pair with black pepper to boost absorption 2000%" }],
  [/cumin/i,            { description: "Earthy, warm spice", nutrition: "Iron source, aids digestion", tip: "Toast whole seeds in dry pan for deeper flavor" }],
  [/salt/i,             { description: "Essential mineral seasoning", nutrition: "Sodium — use mindfully if watching intake", tip: "Season throughout cooking, not just at the end" }],

  // Condiments & Liquids
  [/olive oil|oil/i,    { description: "Cooking fat / finishing oil", nutrition: "Extra virgin has heart-healthy monounsaturated fats", tip: "EVOO for finishing, regular for high-heat cooking" }],
  [/vinegar/i,          { description: "Acidic liquid for cooking", nutrition: "May aid blood sugar regulation", tip: "A splash brightens any dish" }],
  [/soy sauce/i,        { description: "Fermented soybean condiment", nutrition: "High sodium — a little goes a long way", tip: "Low-sodium version has 40% less salt" }],
  [/honey/i,            { description: "Natural sweetener from bees", nutrition: "Antioxidants, trace minerals", tip: "Never give honey to infants under 1 year" }],
  [/sugar/i,            { description: "Sweetener, many forms", nutrition: "Simple carbohydrate — use in moderation" }],
  [/chocolate|cocoa/i,  { description: "Cacao-based ingredient", nutrition: "Dark chocolate (70%+) has antioxidants", tip: "Higher cacao % = more health benefits, less sugar" }],
  [/broth|stock/i,      { description: "Savory cooking liquid", nutrition: "Bone broth has collagen and minerals", tip: "Reduce by half for concentrated flavor" }],

  // Beverages
  [/coffee|espresso/i,  { description: "Caffeinated bean beverage", nutrition: "Antioxidants, may boost metabolism", tip: "Store beans airtight, away from light" }],
  [/tea\b/i,            { description: "Steeped leaf beverage", nutrition: "Green tea rich in catechin antioxidants" }],
  [/wine/i,             { description: "Fermented grape beverage", nutrition: "Red wine contains resveratrol — in moderation", tip: "Cook with wine you'd actually drink" }],

  // Nuts & Seeds
  [/almond/i,           { description: "Mild, versatile tree nut", nutrition: "Vitamin E, magnesium, healthy fats" }],
  [/walnut/i,           { description: "Rich, slightly bitter nut", nutrition: "Highest omega-3 of any nut" }],
  [/peanut/i,           { description: "Legume nut, rich and savory", nutrition: "High protein, niacin, vitamin E", tip: "Common allergen — always flag in recipes" }],
  [/sesame/i,           { description: "Tiny nutty seed", nutrition: "Calcium, iron, magnesium" }],

  // Prepared
  [/tofu|tempeh/i,      { description: "Soy-based protein", nutrition: "Complete plant protein, calcium, iron", tip: "Press tofu 20 min for better texture" }],
];

export function getIngredientInfo(name: string): IngredientTip | null {
  for (const [pattern, info] of INFO_MAP) {
    if (pattern.test(name)) return info;
  }
  return null;
}
