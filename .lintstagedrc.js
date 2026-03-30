module.exports = {
  '*.{js,ts}': [
    'biome check --write',
    'cspell . --no-progress --no-color --no-summary',
    () => 'tsc -p tsconfig.build.json --pretty --noEmit'
  ],
  '*.{md,mdx}': ['markdownlint'],
  '{LICENSE,README.md,TODO.md,.github/**/*.md,src/**/*.ts}': ['cspell --gitignore'],
  'package.json': ['npmPkgJsonLint']
}
