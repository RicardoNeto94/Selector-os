import { parseBottleSizeCl } from './wineInventory.js';

export const CATALOGUE_FIELDS = ['name', 'producer', 'wine_type', 'country', 'region', 'vintage', 'size', 'sku'];

export function parseCatalogueCorrection(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid correction.');
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (!CATALOGUE_FIELDS.includes(key)) throw new Error(`The field ${key} cannot be changed here.`);
    if (typeof value !== 'string' || value.length > 250) throw new Error(`Invalid ${key}.`);
    result[key] = value.trim();
  }
  if (!Object.keys(result).length) throw new Error('No changes supplied.');
  if ('name' in result && !result.name) throw new Error('Wine name is required.');
  for (const key of ['producer', 'wine_type', 'sku']) if (key in result && !result[key]) throw new Error(`${key} cannot be empty.`);
  if ('wine_type' in result && !['red','white','rosé','rose','sparkling','champagne','orange','dessert','sake','non-alcoholic','fortified'].includes(result.wine_type.toLowerCase())) throw new Error('Choose a recognised wine type.');
  if ('size' in result && !parseBottleSizeCl(result.size, '')) throw new Error('Enter a valid bottle size, such as 75cl, 150cl or 750ml.');
  return result;
}
