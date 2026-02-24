# dispersa

## 1.0.0

### Major Changes

- [`6db9b0e`](https://github.com/dispersa-core/dispersa/commit/6db9b0e1f0246ea9579812bf469d532a3e8a340c) Thanks [@timges](https://github.com/timges)! - - [BREAKING] rework dispersa api to be functional insted of class based. The classbased approach was unnecessary, cause consecutive builds with the same instance are unlikely + the state the instance holds is very little. Functional exposure improves the DX by a lot.

### Minor Changes

- [`6db9b0e`](https://github.com/dispersa-core/dispersa/commit/6db9b0e1f0246ea9579812bf469d532a3e8a340c) Thanks [@timges](https://github.com/timges)! - - introduce comprehensive linting api

- [`6db9b0e`](https://github.com/dispersa-core/dispersa/commit/6db9b0e1f0246ea9579812bf469d532a3e8a340c) Thanks [@timges](https://github.com/timges)! - - unifiy metadata rendering (description, deprecation, ...) and resolve inconsistencies between output targets

- [`6db9b0e`](https://github.com/dispersa-core/dispersa/commit/6db9b0e1f0246ea9579812bf469d532a3e8a340c) Thanks [@timges](https://github.com/timges)! - - improve path-schema linting rule. It's stable now and offers good performance [O(2 * n]) through DP processing

## 0.4.3

### Patch Changes

- - feat: made `nameKebabCase` default behavior since we were having a weird hybrid. `--` prefix was added but token was in dot notatin. Now it's proper css custom property syntax by default
  - feat: removed `nameCssVar` transformer, as it's not really needed at all
  - refactor: fixed som stale links in the docs

  this is actually breaking, but since we're still sub v1 we'll only do a `minor` bump

## 0.4.2

### Patch Changes

- - refactor and cleanup - update stale readmes

## 0.4.1

### Patch Changes

- fix missing type export

## 0.4.0

### Minor Changes

- [`81faacd`](https://github.com/dispersa-core/dispersa/commit/81faacdfdd26a7b112cf2880cb673364b7527b37) Thanks [@timges](https://github.com/timges)! - - implement `$root` stripping in token pipeline for clean DTCG group default values in output
  - replace semantic token layer with alias tokens across example starters

## 0.3.1

### Patch Changes

- update package metadata

## 0.3.0

### Minor Changes

- [`ad99ecd`](https://github.com/dispersa-core/dispersa/commit/ad99ecdf436eeafe24da56adb3ec1ff17b1b2027) Thanks [@timges](https://github.com/timges)! - - improve stability of inbuilt css output renderer
  - improve create script scaffold example

## 0.2.0

### Minor Changes

- [`61707da`](https://github.com/timges/dispersa/commit/61707da2e5eacc5eca5d939bb413238348be0736) Thanks [@timges](https://github.com/timges)! - implement experimental ios, android and tailwind output targets, add create script

## 0.1.3

### Patch Changes

- 2c9a814: update readme

## 0.1.2

### Patch Changes

- include readme

## 0.1.1

### Patch Changes

- first alpha release of Dispersa
