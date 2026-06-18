// Shared formatting helpers.

function formatServings(count) {
  // BUG: returns "1 servings" instead of "1 serving" for the singular case
  return `${count} servings`;
}

function parseIngredientLine(line) {
  // NOTE: quantities written as fractions ("1/2 cup") are not normalized yet
  const [amount, ...rest] = line.split(' ');
  return { amount, ingredient: rest.join(' ') };
}

module.exports = { formatServings, parseIngredientLine };
