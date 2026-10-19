const github = "https://github.com/UlloaSP/mlsuite";
const blob = `${github}/blob/main`;

export const links = {
  home: "https://mlsuite.eshkra.dev/",
  eshkra: "https://eshkra.dev/",
  app: "https://mlsuite.irlab.org/",
  register: "https://mlsuite.irlab.org/login?mode=register",
  docs: "https://docs.mlsuite.eshkra.dev/",
  github,
  issues: `${github}/issues`,
  discussions: `${github}/discussions`,
  license: `${blob}/LICENSE`,
  security: `${blob}/SECURITY.md`,
  releases: `${blob}/docs/RELEASES.md`,
  readme: `${github}#readme`,
};

export const description =
  "Open-source platform that turns trained models into reviewable applications: upload a bundle, run predictions through a generated form, collect reviews and corrections, and export the results.";

// The development stack from the README, as one copyable block.
export const selfHost = `git clone https://github.com/UlloaSP/mlsuite.git
cd mlsuite && cp .env.example .env
docker compose -f docker-compose.yml \\
  -f docker-compose.dev.yml up --build -d
# then open http://localhost:5173`;

// The eshkra path from a trained model to a reviewed prediction, as on eshkra.dev.
export const family = [
  { name: "mlbundle", stage: "Package", href: "https://mlbundle.eshkra.dev/" },
  { name: "mlschema", stage: "Describe", href: "https://mlschema.eshkra.dev/" },
  { name: "mlform", stage: "Render", href: "https://mlform.eshkra.dev/" },
  { name: "mlsuite", stage: "Run & review", href: "https://mlsuite.eshkra.dev/" },
] as const;
