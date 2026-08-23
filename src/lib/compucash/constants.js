export const COMPUCASH_PHYSICAL_WINE_GROUP_IDS = new Set([
  "14", // Sparkling
  "15", // White
  "16", // Red
  "63", // Fortified
  "67", // Dessert
  "68", // Rose
  "76", // Champagne
  "77", // Sake & Shochu
  "78", // Non-alcoholic
]);

// Compucash store IDs are immutable. Names are retained only for diagnostics.
export const COMPUCASH_STORE_TARGETS = [
  ["27", "6cbec95d-ebb8-47be-92cc-89c2c14b0fd0", "Burman Beverage Store"],
  ["26", "6cbec95d-ebb8-47be-92cc-89c2c14b0fd0", "Juri Beverage Warehouse"],
  ["5", "6cbec95d-ebb8-47be-92cc-89c2c14b0fd0", "Main Store Beverages"],
  ["7", "9a5816fd-159d-4bba-b274-01766f90b10b", "Casino Bar Beverages"],
  ["11", "801fc04b-1d17-44c4-869a-cced1ecc1f7a", "Ecrin Beverages"],
  ["6", "85c1962f-535e-4667-93ff-a1d70206d1e6", "Fox Den Beverages"],
  ["13", "8686f110-ef73-4d28-802e-c0944e0dea24", "Koyo Beverages"],
  ["8", "60ba540b-9fd2-4deb-96af-853d2c7c482b", "Peacock Lounge Beverages"],
  ["17", "67f582a3-a6f1-4c1d-9ac6-1b58dd4a64a0", "Room Service"],
  ["3", "d7ec429b-39e3-41b7-b39f-3e324b2a4a0d", "Shang Shi Beverages"],
  ["9", "1040d792-52d8-4c29-b31e-300afd9f04e0", "Velvet Beverages"],
].map(([externalStoreId, locationId, expectedName]) => ({
  externalStoreId,
  locationId,
  expectedName,
}));
