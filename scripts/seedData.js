"use strict";

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const dotenv   = require("dotenv");
const path     = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User      = require("../models/User");
const Shop      = require("../models/Shop");
const Product   = require("../models/Product");
const Review    = require("../models/Review");
const Favourite = require("../models/Favourite");
const Cart      = require("../models/Cart");

const RAW_SHOPKEEPERS = [
  { name: "Ramesh Kumar",   email: "ramesh@shop.com",   password: "Shop@1234", phone: "9800011001" },
  { name: "Sunita Devi",    email: "sunita@shop.com",   password: "Shop@1234", phone: "9800011002" },
  { name: "Arjun Mehta",    email: "arjun@shop.com",    password: "Shop@1234", phone: "9800011003" },
  { name: "Priya Sharma",   email: "priya@shop.com",    password: "Shop@1234", phone: "9800011004" },
  { name: "Vikram Yadav",   email: "vikram@shop.com",   password: "Shop@1234", phone: "9800011005" },
];

const RAW_CUSTOMERS = [
  { name: "Aarav Singh",    email: "aarav@user.com",    password: "User@1234", phone: "9900022001" },
  { name: "Meera Nair",     email: "meera@user.com",    password: "User@1234", phone: "9900022002" },
  { name: "Rohan Das",      email: "rohan@user.com",    password: "User@1234", phone: "9900022003" },
  { name: "Sneha Patel",    email: "sneha@user.com",    password: "User@1234", phone: "9900022004" },
  { name: "Kiran Reddy",    email: "kiran@user.com",    password: "User@1234", phone: "9900022005" },
];

const SHOP_SEEDS = [
  {
    name: "Ramesh General Store",
    description: "Your one-stop shop for daily groceries and household needs.",
    category: "Grocery",
    address: { street: "12 Station Road", city: "Kharagpur", state: "West Bengal", pincode: "721301" },
    location: { type: "Point", coordinates: [87.3119, 22.3460] },
    phone: "9800011001",
    email: "ramesh@shop.com",
  },
  {
    name: "Sunita Electronics Hub",
    description: "Latest gadgets, accessories and appliances at the best prices.",
    category: "Electronics",
    address: { street: "45 OT Road", city: "Kharagpur", state: "West Bengal", pincode: "721301" },
    location: { type: "Point", coordinates: [87.3145, 22.3480] },
    phone: "9800011002",
    email: "sunita@shop.com",
  },
  {
    name: "Arjun Pharma & Wellness",
    description: "Medicines, supplements, health & beauty products.",
    category: "Pharmacy",
    address: { street: "7 IIT Gate Road", city: "Kharagpur", state: "West Bengal", pincode: "721302" },
    location: { type: "Point", coordinates: [87.3090, 22.3500] },
    phone: "9800011003",
    email: "arjun@shop.com",
  },
  {
    name: "Priya Fashion World",
    description: "Trendy clothing for men, women and kids.",
    category: "Clothing",
    address: { street: "23 Inda Market", city: "Kharagpur", state: "West Bengal", pincode: "721305" },
    location: { type: "Point", coordinates: [87.3070, 22.3440] },
    phone: "9800011004",
    email: "priya@shop.com",
  },
  {
    name: "Vikram Hardware & Tools",
    description: "Construction materials, tools, plumbing & electrical goods.",
    category: "Hardware",
    address: { street: "88 Malancha Road", city: "Kharagpur", state: "West Bengal", pincode: "721301" },
    location: { type: "Point", coordinates: [87.3160, 22.3420] },
    phone: "9800011005",
    email: "vikram@shop.com",
  },
];


const PRODUCT_DATA = [

  // ── SHOP 0  — Grocery ──────────────────────────────────────────────────────
  { shopIndex: 0, name: "Tata Salt",              description: "Iodised refined free-flow salt, 1 kg pack.",                                  category: "Grocery",       price: 22,    stock: 200, unit: "kg"    },
  { shopIndex: 0, name: "Aashirvaad Atta",        description: "Whole wheat flour, enriched with vitamins. 5 kg bag.",                        category: "Grocery",       price: 270,   stock: 80,  unit: "kg"    },
  { shopIndex: 0, name: "Fortune Sunflower Oil",  description: "Refined sunflower oil. 1-litre pouch.",                                       category: "Grocery",       price: 145,   stock: 60,  unit: "litre" },
  { shopIndex: 0, name: "Amul Butter",            description: "Pasteurised salted butter, 500 g.",                                           category: "Grocery",       price: 270,   stock: 40,  unit: "piece" },
  { shopIndex: 0, name: "Basmati Rice",           description: "Premium long-grain aged basmati rice, 5 kg bag.",                             category: "Grocery",       price: 450,   stock: 50,  unit: "kg"    },
  { shopIndex: 0, name: "Toor Dal",               description: "Split red lentils, fresh lot. 1 kg pack.",                                    category: "Grocery",       price: 135,   stock: 100, unit: "kg"    },
  { shopIndex: 0, name: "Nescafe Classic",        description: "Instant coffee, 50 g jar. Rich and aromatic.",                                category: "Grocery",       price: 200,   stock: 45,  unit: "piece" },
  { shopIndex: 0, name: "Bournvita",              description: "Chocolate malt health drink, 500 g jar.",                                     category: "Grocery",       price: 285,   stock: 35,  unit: "piece" },
  { shopIndex: 0, name: "Maggi Noodles 12-Pack",  description: "Classic masala instant noodles, pack of 12 (70 g each).",                     category: "Grocery",       price: 168,   stock: 90,  unit: "pack"  },
  { shopIndex: 0, name: "Amul Full Cream Milk",   description: "Pasteurised homogenised full cream milk, 1 litre tetra pack.",                 category: "Grocery",       price: 68,    stock: 120, unit: "litre" },
  { shopIndex: 0, name: "Onions",                 description: "Fresh red onions, locally sourced. Sold per kg.",                             category: "Grocery",       price: 30,    stock: 150, unit: "kg"    },
  { shopIndex: 0, name: "Tomatoes",               description: "Farm-fresh ripe tomatoes. Sold per kg.",                                      category: "Grocery",       price: 25,    stock: 120, unit: "kg"    },
  { shopIndex: 0, name: "Potatoes",               description: "Fresh washed potatoes. Sold per kg.",                                         category: "Grocery",       price: 22,    stock: 200, unit: "kg"    },
  { shopIndex: 0, name: "Ginger Garlic Paste",    description: "Ready-to-use ginger garlic paste, 200 g jar.",                                category: "Grocery",       price: 55,    stock: 70,  unit: "piece" },
  { shopIndex: 0, name: "MDH Garam Masala",       description: "Aromatic spice blend, 100 g pack.",                                           category: "Grocery",       price: 82,    stock: 60,  unit: "piece" },
  { shopIndex: 0, name: "Turmeric Powder",        description: "Pure Haldi powder, 200 g pack.",                                              category: "Grocery",       price: 48,    stock: 80,  unit: "piece" },
  { shopIndex: 0, name: "Red Chilli Powder",      description: "Hot Kashmiri red chilli powder, 100 g.",                                      category: "Grocery",       price: 42,    stock: 75,  unit: "piece" },
  { shopIndex: 0, name: "Green Tea",              description: "Tetley Green Tea, 25 bags per box.",                                          category: "Grocery",       price: 110,   stock: 55,  unit: "piece" },
  { shopIndex: 0, name: "Horlicks",               description: "Malt-based nutritional drink, 500 g jar.",                                    category: "Grocery",       price: 295,   stock: 30,  unit: "piece" },
  { shopIndex: 0, name: "Parle-G Biscuits",       description: "Classic glucose biscuits, 800 g family pack.",                                category: "Grocery",       price: 60,    stock: 100, unit: "pack"  },
  { shopIndex: 0, name: "Kissan Mixed Fruit Jam", description: "Mixed fruit jam, 500 g jar. Great with bread.",                               category: "Grocery",       price: 115,   stock: 40,  unit: "piece" },
  { shopIndex: 0, name: "Britannia Brown Bread",  description: "Whole wheat brown bread loaf, 400 g.",                                        category: "Grocery",       price: 45,    stock: 60,  unit: "piece" },
  { shopIndex: 0, name: "Eggs (30-pack tray)",    description: "Fresh farm eggs, tray of 30.",                                                category: "Grocery",       price: 195,   stock: 25,  unit: "piece" },
  { shopIndex: 0, name: "Chana Dal",              description: "Split Bengal gram, 1 kg pack.",                                               category: "Grocery",       price: 110,   stock: 90,  unit: "kg"    },
  { shopIndex: 0, name: "Surf Excel Powder",      description: "Detergent powder, 1 kg pack. Removes tough stains.",                          category: "Grocery",       price: 185,   stock: 55,  unit: "kg"    },

  // ── SHOP 1  — Electronics ─────────────────────────────────────────────────
  { shopIndex: 1, name: "boAt Bassheads 100",     description: "Wired in-ear earphones with mic, 10mm drivers.",                              category: "Electronics",   price: 399,   stock: 30,  unit: "piece" },
  { shopIndex: 1, name: "Redmi Buds 4 Active",    description: "True wireless earbuds, 30-hour playback, IPX4.",                              category: "Electronics",   price: 1299,  stock: 15,  unit: "piece" },
  { shopIndex: 1, name: "Portronics Power Pro 10",description: "10,000 mAh power bank, dual USB-A + USB-C, 22.5W.",                           category: "Electronics",   price: 1199,  stock: 20,  unit: "piece" },
  { shopIndex: 1, name: "Zebronics ZEB-500HMV",   description: "USB wired optical mouse, 1200 DPI, plug and play.",                           category: "Electronics",   price: 349,   stock: 25,  unit: "piece" },
  { shopIndex: 1, name: "Lapcare USB Hub 4-Port",  description: "4-port USB 3.0 hub with LED indicator. Compact design.",                     category: "Electronics",   price: 599,   stock: 18,  unit: "piece" },
  { shopIndex: 1, name: "Mi 65W Fast Charger",    description: "GaN fast charger with USB-C PD, foldable plug.",                              category: "Electronics",   price: 999,   stock: 22,  unit: "piece" },
  { shopIndex: 1, name: "Syska LED Bulb 9W",      description: "Cool white LED bulb, B22 base, 900 lm, 4-year warranty.",                     category: "Electronics",   price: 85,    stock: 80,  unit: "piece" },
  { shopIndex: 1, name: "Philips LED Strip 5m",   description: "RGB LED flexible strip, 5 m roll with remote.",                               category: "Electronics",   price: 699,   stock: 12,  unit: "piece" },
  { shopIndex: 1, name: "Redmi 10000mAh PowerBank",description: "Slim dual-port power bank, 18W fast charge.",                               category: "Electronics",   price: 1599,  stock: 10,  unit: "piece" },
  { shopIndex: 1, name: "D-Link WiFi Router N150", description: "150 Mbps N150 WiFi router, 2 antennas, easy setup.",                        category: "Electronics",   price: 899,   stock: 8,   unit: "piece" },
  { shopIndex: 1, name: "Panasonic AA Batteries (4-pack)", description: "Alkaline AA batteries, 1.5V, pack of 4.",                            category: "Electronics",   price: 120,   stock: 60,  unit: "pack"  },
  { shopIndex: 1, name: "HDMI Cable 1.5m",        description: "4K HDMI 2.0 cable, gold-plated connectors.",                                  category: "Electronics",   price: 249,   stock: 35,  unit: "piece" },
  { shopIndex: 1, name: "USB-C to USB-C Cable 1m","description": "Fast-charging braided cable, 60W, 480 Mbps.",                               category: "Electronics",   price: 299,   stock: 40,  unit: "piece" },
  { shopIndex: 1, name: "Laptop Cooling Pad",     description: "Dual-fan aluminium cooling pad for 15.6\" laptops.",                          category: "Electronics",   price: 799,   stock: 14,  unit: "piece" },
  { shopIndex: 1, name: "Wireless Keyboard & Mouse Combo", description: "2.4 GHz wireless set, quiet keys, 12-month battery.",               category: "Electronics",   price: 1299,  stock: 9,   unit: "piece" },
  { shopIndex: 1, name: "Realme Smart Bulb 9W",   description: "Wi-Fi smart LED bulb, voice control, 16M colours.",                           category: "Electronics",   price: 499,   stock: 20,  unit: "piece" },
  { shopIndex: 1, name: "Sandisk 32GB Pen Drive",  description: "USB 3.1 flash drive, 130 MB/s read speed.",                                  category: "Electronics",   price: 399,   stock: 28,  unit: "piece" },
  { shopIndex: 1, name: "Screen Guard (6.5\" Universal)", description: "Tempered glass screen protector, 9H hardness.",                      category: "Electronics",   price: 149,   stock: 50,  unit: "piece" },
  { shopIndex: 1, name: "Mobile Back Cover (Silicone)", description: "Transparent shock-absorbing silicone case, universal fit.",             category: "Electronics",   price: 99,    stock: 70,  unit: "piece" },
  { shopIndex: 1, name: "boAt Airdopes 141",       description: "True wireless stereo earbuds, 42H playtime, IPX4.",                          category: "Electronics",   price: 1199,  stock: 12,  unit: "piece" },

  // ── SHOP 2  — Pharmacy ───────────────────────────────────────────────────
  { shopIndex: 2, name: "Dettol Antiseptic Liquid 250ml", description: "Multi-use antiseptic disinfectant. Protects against germs.",         category: "Pharmacy",      price: 115,   stock: 60,  unit: "piece" },
  { shopIndex: 2, name: "Paracetamol 500mg (Strip of 10)", description: "Antipyretic and analgesic tablets for fever and pain relief.",       category: "Pharmacy",      price: 15,    stock: 200, unit: "piece" },
  { shopIndex: 2, name: "Vicks VapoRub 50g",       description: "Topical ointment for cough, cold and headache relief.",                     category: "Pharmacy",      price: 115,   stock: 55,  unit: "piece" },
  { shopIndex: 2, name: "Cetaphil Moisturising Cream 250g", description: "Gentle, non-greasy moisturiser for sensitive skin.",               category: "Pharmacy",      price: 425,   stock: 25,  unit: "piece" },
  { shopIndex: 2, name: "Evion Vitamin E 400mg (10 caps)", description: "Natural vitamin E capsules for skin and immunity.",                  category: "Pharmacy",      price: 55,    stock: 80,  unit: "piece" },
  { shopIndex: 2, name: "ORS Electrolyte Powder",  description: "Oral rehydration salts, orange flavour, pack of 10 sachets.",               category: "Pharmacy",      price: 60,    stock: 90,  unit: "pack"  },
  { shopIndex: 2, name: "Band-Aid Assorted (30-pack)", description: "Flexible fabric bandages, assorted sizes.",                             category: "Pharmacy",      price: 95,    stock: 70,  unit: "pack"  },
  { shopIndex: 2, name: "Digene Antacid Gel 200ml", description: "Fast-acting antacid for acidity, gas and heartburn.",                      category: "Pharmacy",      price: 98,    stock: 45,  unit: "piece" },
  { shopIndex: 2, name: "Himalaya Ashvagandha 60 Tabs", description: "Herbal adaptogen to reduce stress and boost energy.",                  category: "Pharmacy",      price: 175,   stock: 35,  unit: "piece" },
  { shopIndex: 2, name: "Revital H for Men (30 caps)", description: "Daily multivitamin and multimineral supplement.",                       category: "Pharmacy",      price: 285,   stock: 30,  unit: "piece" },
  { shopIndex: 2, name: "Volini Pain Relief Spray", description: "Fast-acting topical analgesic spray for muscle and joint pain.",           category: "Pharmacy",      price: 175,   stock: 40,  unit: "piece" },
  { shopIndex: 2, name: "Cetrizine 10mg (Strip of 10)", description: "Antihistamine tablets for allergy relief.",                           category: "Pharmacy",      price: 18,    stock: 150, unit: "piece" },
  { shopIndex: 2, name: "Glucon-D Instant Energy 500g", description: "Glucose powder, orange flavour. Quick energy drink.",                  category: "Pharmacy",      price: 130,   stock: 50,  unit: "piece" },
  { shopIndex: 2, name: "Himalaya Neem Face Wash 150ml", description: "Purifying neem face wash for acne-prone skin.",                      category: "Pharmacy",      price: 135,   stock: 55,  unit: "piece" },
  { shopIndex: 2, name: "Colgate Sensitive Pro-Relief", description: "Toothpaste for sensitive teeth, 110g tube.",                          category: "Pharmacy",      price: 155,   stock: 65,  unit: "piece" },
  { shopIndex: 2, name: "Disposable Surgical Mask (50-pack)", description: "3-ply non-woven disposable face masks.",                        category: "Pharmacy",      price: 180,   stock: 100, unit: "pack"  },
  { shopIndex: 2, name: "Digital Thermometer",     description: "Fast 60-second reading, beep alert, memory function.",                      category: "Pharmacy",      price: 145,   stock: 30,  unit: "piece" },
  { shopIndex: 2, name: "Livogen Iron Supplement (30 tabs)", description: "Ferrous fumarate + folic acid for iron deficiency.",              category: "Pharmacy",      price: 120,   stock: 40,  unit: "piece" },
  { shopIndex: 2, name: "Betadine Antiseptic Solution 30ml", description: "Povidone-iodine antiseptic for minor cuts and wounds.",          category: "Pharmacy",      price: 55,    stock: 75,  unit: "piece" },
  { shopIndex: 2, name: "Nasal Saline Spray 30ml", description: "Isotonic saline spray for nasal congestion relief.",                       category: "Pharmacy",      price: 115,   stock: 35,  unit: "piece" },

  // ── SHOP 3  — Clothing ────────────────────────────────────────────────────
  { shopIndex: 3, name: "Men's Cotton Round-Neck T-Shirt", description: "180 GSM pure cotton tee, available S–XXL. Multiple colours.",      category: "Clothing",      price: 349,   stock: 40,  unit: "piece" },
  { shopIndex: 3, name: "Men's Formal Shirt",       description: "Slim-fit cotton-blend formal shirt, full sleeves.",                         category: "Clothing",      price: 699,   stock: 25,  unit: "piece" },
  { shopIndex: 3, name: "Jeans – Men's Regular Fit","description": "Mid-rise straight-leg denim, stretch fabric.",                            category: "Clothing",      price: 999,   stock: 20,  unit: "piece" },
  { shopIndex: 3, name: "Women's Printed Kurti",    description: "Rayon kurti with floral print, A-line cut. Sizes XS–XL.",                   category: "Clothing",      price: 549,   stock: 35,  unit: "piece" },
  { shopIndex: 3, name: "Women's Leggings",         description: "High-waist cotton-spandex leggings, 4-way stretch.",                        category: "Clothing",      price: 299,   stock: 50,  unit: "piece" },
  { shopIndex: 3, name: "Kids' Cartoon T-Shirt",    description: "Soft cotton kids tee with cartoon print. Sizes 2–12 years.",                category: "Clothing",      price: 249,   stock: 45,  unit: "piece" },
  { shopIndex: 3, name: "Men's Track Pants",        description: "Cotton-blend joggers with elastic waistband and zip pockets.",               category: "Clothing",      price: 499,   stock: 30,  unit: "piece" },
  { shopIndex: 3, name: "Women's Saree – Cotton",   description: "Handloom cotton saree with blouse piece. Assorted prints.",                 category: "Clothing",      price: 899,   stock: 15,  unit: "piece" },
  { shopIndex: 3, name: "Men's Innerwear Vest (3-pack)", description: "100% cotton vest, ribbed fabric. Pack of 3.",                         category: "Clothing",      price: 299,   stock: 60,  unit: "pack"  },
  { shopIndex: 3, name: "Woollen Muffler / Stole",  description: "Soft acrylic-wool blend muffler, 70 × 200 cm. Assorted colours.",           category: "Clothing",      price: 199,   stock: 40,  unit: "piece" },
  { shopIndex: 3, name: "Men's Shorts",             description: "Cotton casual shorts, elastic waist, two side pockets.",                    category: "Clothing",      price: 349,   stock: 35,  unit: "piece" },
  { shopIndex: 3, name: "Women's Sports Bra",       description: "High-support sports bra for yoga and gym. Sizes S–XL.",                     category: "Clothing",      price: 449,   stock: 25,  unit: "piece" },
  { shopIndex: 3, name: "Denim Jacket – Men's",     description: "Classic blue washed denim jacket, chest pocket.",                           category: "Clothing",      price: 1499,  stock: 10,  unit: "piece" },
  { shopIndex: 3, name: "Ethnic Kurta Pyjama Set",  description: "Cotton kurta + pyjama set for festive occasions.",                          category: "Clothing",      price: 1299,  stock: 12,  unit: "piece" },
  { shopIndex: 3, name: "School Uniform Shirt (White)", description: "White cotton school uniform shirt, S–XL (kids).",                      category: "Clothing",      price: 275,   stock: 55,  unit: "piece" },

  // ── SHOP 4  — Hardware ────────────────────────────────────────────────────
  { shopIndex: 4, name: "Hammer 500g",              description: "Steel head claw hammer with rubber grip handle.",                           category: "Hardware",      price: 295,   stock: 20,  unit: "piece" },
  { shopIndex: 4, name: "Screwdriver Set (6-piece)", description: "Phillips + flathead screwdrivers, CRV steel, magnetic tip.",               category: "Hardware",      price: 399,   stock: 18,  unit: "piece" },
  { shopIndex: 4, name: "Tape Measure 5m",          description: "Auto-lock steel tape measure, thumb brake, wrist strap.",                   category: "Hardware",      price: 249,   stock: 25,  unit: "piece" },
  { shopIndex: 4, name: "PVC Pipe 1-inch (per metre)", description: "Schedule 40 PVC pressure pipe, 1\" OD. Sold per metre.",                category: "Hardware",      price: 55,    stock: 100, unit: "piece" },
  { shopIndex: 4, name: "PVC Ball Valve 0.5-inch",   description: "Quarter-turn ball valve for water supply lines.",                          category: "Hardware",      price: 75,    stock: 40,  unit: "piece" },
  { shopIndex: 4, name: "Cement (OPC 53 Grade) 50kg", description: "Ordinary Portland Cement, 50 kg bag. Locally available.",               category: "Hardware",      price: 390,   stock: 30,  unit: "piece" },
  { shopIndex: 4, name: "Wall Putty 20kg",           description: "White cement-based wall putty for smooth finish.",                         category: "Hardware",      price: 580,   stock: 15,  unit: "piece" },
  { shopIndex: 4, name: "Paint Brush Set (4-piece)", description: "Synthetic-bristle brushes: 1\", 2\", 3\" and 4\".",                       category: "Hardware",      price: 199,   stock: 30,  unit: "piece" },
  { shopIndex: 4, name: "Asian Paints Exterior Emulsion 1L", description: "Weatherproof exterior wall paint, white base.",                   category: "Hardware",      price: 485,   stock: 12,  unit: "litre" },
  { shopIndex: 4, name: "Electrical Wire 1.5 sq mm (per metre)", description: "Copper FR-PVC single-core wire.",                              category: "Hardware",      price: 22,    stock: 200, unit: "piece" },
  { shopIndex: 4, name: "MCB Switch 6A (Single Pole)", description: "Miniature circuit breaker for home wiring, ISI marked.",                category: "Hardware",      price: 185,   stock: 25,  unit: "piece" },
  { shopIndex: 4, name: "Power Drill Machine 550W",  description: "Variable-speed corded drill, 13mm chuck, reversible.",                    category: "Hardware",      price: 2499,  stock: 6,   unit: "piece" },
  { shopIndex: 4, name: "Angle Grinder 4\" 850W",    description: "Corded angle grinder for cutting and grinding metal.",                    category: "Hardware",      price: 1799,  stock: 5,   unit: "piece" },
  { shopIndex: 4, name: "Nails Assorted (500g pack)", description: "Iron wire nails, assorted sizes 1\"–3\", 500 g box.",                    category: "Hardware",      price: 120,   stock: 40,  unit: "pack"  },
  { shopIndex: 4, name: "WD-40 Multi-Use Spray 400ml", description: "Lubricant, rust preventer and penetrant spray.",                        category: "Hardware",      price: 355,   stock: 20,  unit: "piece" },
  { shopIndex: 4, name: "Safety Helmet (ISI Marked)", description: "HDPE construction safety helmet, adjustable ratchet.",                   category: "Hardware",      price: 299,   stock: 15,  unit: "piece" },
  { shopIndex: 4, name: "Fevicol SH Adhesive 1kg",   description: "White carpenter glue, waterproof for wood joints.",                       category: "Hardware",      price: 245,   stock: 22,  unit: "piece" },
  { shopIndex: 4, name: "Plastic Sheet (Tarpaulin) 12×15ft", description: "Heavy-duty waterproof blue tarpaulin for roofing/storage.",       category: "Hardware",      price: 650,   stock: 10,  unit: "piece" },
  { shopIndex: 4, name: "Padlock 50mm Brass",        description: "Double-locking brass padlock, 3 keys included.",                          category: "Hardware",      price: 175,   stock: 30,  unit: "piece" },
  { shopIndex: 4, name: "Extension Board 4-Socket",  description: "4-socket surge protector extension cord, 1.5 m, master switch.",         category: "Hardware",      price: 399,   stock: 18,  unit: "piece" },

];

// ─────────────────────────────────────────────────────────────────────────────
// 4.  REVIEW TEXT BANKS
// ─────────────────────────────────────────────────────────────────────────────
const POSITIVE_REVIEWS = [
  "Really good quality for the price. Will buy again!",
  "Fast delivery and well-packaged. Very satisfied.",
  "Exactly as described. Five stars from me.",
  "This is my second purchase — still great quality.",
  "My family loves it. Highly recommend this shop.",
  "Great value, no complaints at all.",
  "Shop owner is very helpful. Product is top-notch.",
  "Better than what I expected. Will recommend to friends.",
  "Always fresh/good quality here. My go-to shop.",
  "Prompt service and genuine product.",
];
const NEUTRAL_REVIEWS = [
  "Decent product. Does the job but nothing extraordinary.",
  "Good but the packaging could be better.",
  "Average quality. Expected a bit more for the price.",
  "It's okay. Product works as advertised.",
];
const NEGATIVE_REVIEWS = [
  "Quality could be improved. Was slightly disappointed.",
  "Product was okay but delivery took longer than expected.",
];

const pickReview = (i) => {
  if (i % 7 === 0) return NEGATIVE_REVIEWS[i % NEGATIVE_REVIEWS.length];
  if (i % 4 === 0) return NEUTRAL_REVIEWS[i % NEUTRAL_REVIEWS.length];
  return POSITIVE_REVIEWS[i % POSITIVE_REVIEWS.length];
};
const pickRating = (i) => {
  if (i % 7 === 0) return 2 + (i % 2);
  if (i % 4 === 0) return 3;
  return 4 + (i % 2);
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  const seedEmails = [
    ...RAW_SHOPKEEPERS.map((u) => u.email),
    ...RAW_CUSTOMERS.map((u) => u.email),
  ];
  const existingUsers = await User.find({ email: { $in: seedEmails } });
  const existingIds   = existingUsers.map((u) => u._id);

  if (existingIds.length) {
    const shops    = await Shop.find({ owner: { $in: existingIds } });
    const shopIds  = shops.map((s) => s._id);
    const products = await Product.find({ shop: { $in: shopIds } });
    const prodIds  = products.map((p) => p._id);

    await Promise.all([
      Review.deleteMany({ product: { $in: prodIds } }),
      Favourite.deleteMany({ user: { $in: existingIds } }),
      Cart.deleteMany({ user: { $in: existingIds } }),
      Product.deleteMany({ shop: { $in: shopIds } }),
      Shop.deleteMany({ _id: { $in: shopIds } }),
      User.deleteMany({ _id: { $in: existingIds } }),
    ]);
    console.log("🗑  Cleared previous seed data");
  }

  // ── Create shopkeeper users ───────────────────────────────────────────────
  const shopkeeperDocs = await User.create(
    RAW_SHOPKEEPERS.map((u) => ({ ...u, role: "shopkeeper" }))
  );
  console.log(`👤 Created ${shopkeeperDocs.length} shopkeeper accounts`);

  // ── Create customer users ─────────────────────────────────────────────────
  const customerDocs = await User.create(
    RAW_CUSTOMERS.map((u) => ({ ...u, role: "customer" }))
  );
  console.log(`👤 Created ${customerDocs.length} customer accounts`);

  // ── Create shops ──────────────────────────────────────────────────────────
  const shopDocs = await Shop.create(
    SHOP_SEEDS.map((s, i) => ({
      ...s,
      owner:    shopkeeperDocs[i]._id,
      isActive: true,
      isOpen:   true,
    }))
  );
  console.log(`🏪 Created ${shopDocs.length} shops`);

  // ── Create products ───────────────────────────────────────────────────────
  const now = new Date();
  const productDocs = await Product.create(
    PRODUCT_DATA.map((p, idx) => {
      const shop  = shopDocs[p.shopIndex];
      const owner = shopkeeperDocs[p.shopIndex];
      // Inject 3 historical price points
      const history = [
        { price: Math.round(p.price * 0.88), date: new Date(now - 60 * 86400000) },
        { price: Math.round(p.price * 0.94), date: new Date(now - 30 * 86400000) },
        { price: p.price,                    date: now },
      ];
      return {
        shop:         shop._id,
        owner:        owner._id,
        name:         p.name,
        description:  p.description,
        category:     p.category,
        price:        p.price,
        stock:        p.stock,
        unit:         p.unit,
        isAvailable:  p.stock > 0,
        priceHistory: history,
        image:        "",
        images:       [],
      };
    })
  );
  console.log(`📦 Created ${productDocs.length} products`);

  // ── Create reviews (2-4 per product, from random customers) ──────────────
  const reviewSeed = [];
  productDocs.forEach((prod, pIdx) => {
    const count = 2 + (pIdx % 3); // 2, 3 or 4 reviews
    for (let r = 0; r < count; r++) {
      const customer = customerDocs[(pIdx + r) % customerDocs.length];
      reviewSeed.push({
        product:  prod._id,
        user:     customer._id,
        rating:   pickRating(pIdx + r),
        comment:  pickReview(pIdx + r),
      });
    }
  });
  await Review.create(reviewSeed);
  console.log(`⭐ Created ${reviewSeed.length} reviews`);

  // ── Create favourites (each customer favourites ~10 random products) ──────
  const favSeed = [];
  customerDocs.forEach((cust, ci) => {
    for (let f = 0; f < 10; f++) {
      const prod = productDocs[(ci * 13 + f * 7) % productDocs.length];
      favSeed.push({ user: cust._id, product: prod._id });
    }
  });
  // Deduplicate user+product combos
  const favMap = new Map();
  favSeed.forEach((fav) => {
    const key = `${fav.user}-${fav.product}`;
    if (!favMap.has(key)) favMap.set(key, fav);
  });
  await Favourite.create([...favMap.values()]);
  console.log(`❤️  Created ${favMap.size} favourites`);

  // ── Create cart items (each customer has 3-5 items in cart) ───────────────
  const cartSeed = [];
  customerDocs.forEach((cust, ci) => {
    const count = 3 + (ci % 3);
    for (let c = 0; c < count; c++) {
      const prod = productDocs[(ci * 17 + c * 11) % productDocs.length];
      cartSeed.push({ user: cust._id, product: prod._id, quantity: 1 + (c % 3) });
    }
  });
  await Cart.create(cartSeed);
  console.log(`🛒 Created ${cartSeed.length} cart entries`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  🌱  Seed complete! Login credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n  SHOPKEEPERS (password: Shop@1234)");
  RAW_SHOPKEEPERS.forEach((u) => console.log(`  • ${u.email}`));
  console.log("\n  CUSTOMERS (password: User@1234)");
  RAW_CUSTOMERS.forEach((u) => console.log(`  • ${u.email}`));
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});