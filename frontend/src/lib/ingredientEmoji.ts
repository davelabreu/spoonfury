const EMOJI_MAP: Array<[RegExp, string]> = [
  // Vegetables & Aromatics
  [/carrot/i,                          "🥕"],
  [/corn|maize/i,                      "🌽"],
  [/broccoli/i,                        "🥦"],
  [/\bonion|shallot/i,                 "🧅"],
  [/garlic/i,                          "🧄"],
  [/potato|yam|sweet potato/i,         "🥔"],
  [/tomato/i,                          "🍅"],
  [/eggplant|aubergine/i,              "🍆"],
  [/avocado/i,                         "🥑"],
  [/lettuce|spinach|kale|bok.?choy|cabbage|chard|arugula|rocket/i, "🥬"],
  [/cucumber|courgette|zucchini/i,     "🥒"],
  [/pepper|capsicum|chili|chilli/i,    "🫑"],
  [/mushroom/i,                        "🍄"],
  [/celery/i,                          "🥬"],
  [/asparagus/i,                       "🥦"],
  [/pea\b|green bean|snap pea/i,       "🫛"],
  [/bean|lentil|chickpea|legume/i,     "🫘"],
  [/pumpkin|squash|butternut/i,        "🎃"],
  [/ginger/i,                          "🫚"],

  // Fruit
  [/lemon|lime/i,                      "🍋"],
  [/apple/i,                           "🍎"],
  [/orange|mandarin|clementine/i,      "🍊"],
  [/grape/i,                           "🍇"],
  [/strawberr/i,                       "🍓"],
  [/banana/i,                          "🍌"],
  [/watermelon/i,                      "🍉"],
  [/peach|apricot/i,                   "🍑"],
  [/blueberr|blackberr/i,              "🫐"],
  [/kiwi/i,                            "🥝"],
  [/mango/i,                           "🥭"],
  [/pineapple/i,                       "🍍"],
  [/cherry|cherries/i,                 "🍒"],
  [/coconut/i,                         "🥥"],
  [/pear/i,                            "🍐"],

  // Proteins
  [/chicken|poultry|hen|turkey/i,      "🍗"],
  [/beef|steak|ribeye|rib.?eye|sirloin|tenderloin|filet|fillet|brisket|flank|chuck|mince|ground meat|veal|roast\b/i, "🥩"],
  [/pork|ham|prosciutto|pancetta|pulled/i, "🥩"],
  [/lamb|mutton|rack of/i,             "🥩"],
  [/bacon|lardons/i,                   "🥓"],
  [/sausage|salami|chorizo|pepperoni/i,"🌭"],
  [/salmon|tuna|cod|halibut|fish|tilapia|bass|trout/i, "🐟"],
  [/shrimp|prawn/i,                    "🦐"],
  [/crab/i,                            "🦀"],
  [/lobster/i,                         "🦞"],
  [/squid|calamari|octopus/i,          "🦑"],
  [/egg/i,                             "🥚"],
  [/tofu|tempeh/i,                     "🧊"],

  // Dairy
  [/cheese|parmesan|mozzarella|cheddar|brie|gouda|feta/i, "🧀"],
  [/butter/i,                          "🧈"],
  [/milk|cream|yogurt|yoghurt/i,       "🥛"],

  // Pantry & Grains
  [/flour|wheat|baking powder|baking soda/i, "🌾"],
  [/sugar|maple syrup/i,               "🍬"],
  [/honey/i,                           "🍯"],
  [/salt/i,                            "🧂"],
  [/pepper\b/i,                        "🌶️"],
  [/olive oil|oil|vegetable oil/i,     "🫒"],
  [/vinegar|balsamic/i,                "🍶"],
  [/soy sauce|sauce/i,                 "🥢"],
  [/broth|stock/i,                     "🍲"],
  [/chocolate|cocoa/i,                 "🍫"],
  [/vanilla/i,                         "🌿"],
  [/wine/i,                            "🍷"],
  [/rice|quinoa/i,                     "🍚"],
  [/pasta|spaghetti|fettuccine|penne|noodle|linguine/i, "🍝"],
  [/bread|loaf|toast/i,                "🍞"],
  [/baguette/i,                        "🥖"],
  [/croissant/i,                       "🥐"],
  [/oat/i,                             "🌾"],
  [/cinnamon|nutmeg|cumin|turmeric|paprika|spice/i, "🫙"],
  [/basil|parsley|cilantro|coriander|dill|mint|thyme|rosemary|oregano|herb/i, "🌿"],

  // Nuts & seeds
  [/almond|walnut|pecan|cashew|pistachio|hazelnut|peanut|nut/i, "🥜"],
  [/sesame|sunflower seed|pumpkin seed|seed/i, "🌰"],

  // Beverages
  [/soda|pop|cola|sprite|fanta|coke/i,  "🥤"],
  [/juice/i,                            "🧃"],
  [/beer|ale|lager|ipa/i,               "🍺"],
  [/coffee|espresso/i,                  "☕"],
  [/tea\b/i,                            "🍵"],
  [/water/i,                            "💧"],
  [/smoothie|shake/i,                   "🥤"],
  [/cocktail|margarita|martini/i,       "🍸"],
  [/whiskey|bourbon|rum|vodka|gin|tequila/i, "🥃"],

  // Prepared / misc
  [/pizza/i,                            "🍕"],
  [/taco|tortilla/i,                    "🌮"],
  [/burrito|wrap/i,                     "🌯"],
  [/sandwich|sub\b/i,                   "🥪"],
  [/pretzel/i,                          "🥨"],
  [/pancake|waffle/i,                   "🧇"],
  [/pie/i,                              "🥧"],
  [/cake/i,                             "🎂"],
  [/cookie|biscuit/i,                   "🍪"],
  [/donut|doughnut/i,                   "🍩"],
  [/ice cream|gelato/i,                 "🍦"],
  [/candy/i,                            "🍭"],
  [/popcorn/i,                          "🍿"],
];

export function getIngredientEmoji(name: string): string {
  for (const [pattern, emoji] of EMOJI_MAP) {
    if (pattern.test(name)) return emoji;
  }
  return "🛒";
}

// Categorized emoji palette for the picker UI
// Ordered by cooking logic: proteins → produce → pantry → fun stuff
// Within each category: most common first
export const PICKER_CATEGORIES = [
  { label: "🍗 Proteins",               color: "bg-rose-50",    emojis: ["🍗","🥩","🍖","🥓","🌭","🦃","🥚","🧊"] },
  { label: "🐟 Seafood",                color: "bg-cyan-50",    emojis: ["🐟","🦐","🍤","🍣","🦀","🦞","🦑","🦪","🐙","🍥"] },
  { label: "🧀 Dairy",                  color: "bg-amber-50",   emojis: ["🧀","🧈","🥛","🍳"] },
  { label: "🧅 Vegetables",             color: "bg-green-50",   emojis: ["🧅","🧄","🍅","🥔","🥕","🌽","🥦","🥬","🥒","🫑","🍆","🥑","🍄","🫛","🫘","🎃","🥗","🌱"] },
  { label: "🍋 Fruit",                  color: "bg-red-50",     emojis: ["🍋","🍎","🍏","🍊","🍌","🍓","🫐","🍇","🍑","🥝","🥭","🍍","🍉","🍒","🍐","🍈","🥥"] },
  { label: "🍞 Pantry & Baking",        color: "bg-yellow-50",  emojis: ["🍞","🥖","🌾","🍝","🍚","🧂","🌶️","🫚","🫙","🫒","🍯","🍬","🍫","🍷","🍲","🥐","🫓","🥨"] },
  { label: "🌿 Herbs & Aromatics",      color: "bg-emerald-50", emojis: ["🌿","🧄","🧅","🫚","🌶️","🫙","🥢","🍶","🫕"] },
  { label: "🥜 Nuts, Seeds & Legumes",  color: "bg-orange-50",  emojis: ["🥜","🌰","🫘","🫛","🥥","🍠","🧆","🌻"] },
  { label: "🍕 Prepared Foods",         color: "bg-purple-50",  emojis: ["🍕","🌮","🌯","🥪","🥟","🍱","🫔","🍛","🍜","🍣"] },
  { label: "🍰 Sweets & Baking",        color: "bg-pink-50",    emojis: ["🍫","🍬","🥧","🎂","🧁","🍪","🍩","🍦","🍭","🍿","🍮"] },
  { label: "☕ Beverages",              color: "bg-sky-50",     emojis: ["💧","☕","🍵","🥛","🧃","🥤","🍺","🍻","🍷","🍸","🥃","🍹","🍾","🥂","🧋","🫖","🧉"] },
];
