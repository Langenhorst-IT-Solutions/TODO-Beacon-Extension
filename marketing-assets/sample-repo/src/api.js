// Tiny fetch wrapper for the recipe API.

async function fetchRecipes(query) {
  // TODO: add pagination support once the API exposes a `page` param
  const res = await fetch(`/api/recipes?q=${encodeURIComponent(query)}`);
  return res.json();
}

async function fetchRecipeById(id) {
  // FIXME: this throws an unhandled rejection when `id` is undefined
  const res = await fetch(`/api/recipes/${id}`);
  return res.json();
}

module.exports = { fetchRecipes, fetchRecipeById };
