// Sibling sites: the local landing while developing, the production hosts in built output.
const dev = import.meta.env.DEV;

export const landingUrl = dev ? "http://localhost:4350/" : "https://mlsuite.eshkra.dev/";
// MLsuite has no playground: the live instance is where readers try it.
export const appUrl = "https://mlsuite.irlab.org/";
export const repositoryUrl = "https://github.com/UlloaSP/mlsuite";
