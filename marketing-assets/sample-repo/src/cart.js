// Shopping cart built from selected recipes.

function addToCart(cart, recipeId, servings) {
  // WARNING: no upper bound on `servings` — a typo can request 10000x a recipe
  cart.push({ recipeId, servings });
  return cart;
}

function legacyMergeCart(cartA, cartB) {
  // DEPRECATED: replaced by `mergeCarts()` below, remove after v2 ships
  return cartA.concat(cartB);
}

function mergeCarts(cartA, cartB) {
  // XXX: duplicate recipeIds are summed instead of merged into one entry
  return [...cartA, ...cartB];
}

module.exports = { addToCart, legacyMergeCart, mergeCarts };
