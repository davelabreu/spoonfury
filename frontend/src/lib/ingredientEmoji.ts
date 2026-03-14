const EMOJI_MAP: Array<[RegExp, string]> = [
  // Vegetables
  [/carrot/i,                          "🥕"],
  [/corn|maize/i,                      "🌽"],
  [/broccoli/i,                        "🥦"],
  [/\bonion/i,                         "🧅"],
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

  // Meat & seafood
  [/chicken|poultry|hen|turkey/i,      "🍗"],
  [/beef|steak|mince|ground meat|veal/i, "🥩"],
  [/pork|ham|prosciutto|pancetta/i,    "🥩"],
  [/lamb|mutton/i,                     "🥩"],
  [/bacon|lardons/i,                   "🥓"],
  [/sausage|salami|chorizo|pepperoni/i,"🌭"],
  [/salmon|tuna|cod|halibut|fish|tilapia|bass|trout/i, "🐟"],
  [/shrimp|prawn/i,                    "🦐"],
  [/crab/i,                            "🦀"],
  [/lobster/i,                         "🦞"],
  [/squid|calamari|octopus/i,          "🦑"],

  // Dairy & eggs
  [/egg/i,                             "🥚"],
  [/cheese|parmesan|mozzarella|cheddar|brie|gouda|feta/i, "🧀"],
  [/butter/i,                          "🧈"],
  [/milk|cream|yogurt|yoghurt/i,       "🥛"],

  // Bread & grains
  [/bread|loaf/i,                      "🍞"],
  [/croissant/i,                       "🥐"],
  [/baguette/i,                        "🥖"],
  [/pasta|spaghetti|fettuccine|penne|noodle|linguine/i, "🍝"],
  [/rice/i,                            "🍚"],
  [/flour|wheat/i,                     "🌾"],
  [/oat/i,                             "🌾"],

  // Herbs & spices
  [/basil|parsley|cilantro|coriander|dill|mint|thyme|rosemary|oregano|herb/i, "🌿"],
  [/salt/i,                            "🧂"],
  [/pepper\b/i,                        "🌶️"],
  [/ginger/i,                          "🫚"],
  [/cinnamon|nutmeg|cumin|turmeric|paprika|spice/i, "🫙"],

  // Condiments & liquids
  [/olive oil|oil/i,                   "🫒"],
  [/vinegar/i,                         "🍶"],
  [/soy sauce|sauce/i,                 "🥢"],
  [/honey/i,                           "🍯"],
  [/sugar/i,                           "🍬"],
  [/chocolate|cocoa/i,                 "🍫"],
  [/vanilla/i,                         "🌿"],
  [/wine/i,                            "🍷"],
  [/broth|stock/i,                     "🍲"],

  // Nuts & seeds
  [/almond|walnut|pecan|cashew|pistachio|hazelnut|nut/i, "🥜"],
  [/sesame|sunflower seed|pumpkin seed|seed/i, "🌰"],
];

export function getIngredientEmoji(name: string): string {
  for (const [pattern, emoji] of EMOJI_MAP) {
    if (pattern.test(name)) return emoji;
  }
  return "🛒";
}
