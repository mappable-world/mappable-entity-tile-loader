# @mappable-world/mappable-entity-tile-loader package

---

Mappable JS API package

[![npm version](https://badge.fury.io/js/@mappable-world/mappable-entity-tile-loader.svg)](https://badge.fury.io/js/@mappable-world/mappable-entity-tile-loader)
[![npm](https://img.shields.io/npm/dm/@mappable-world/mappable-entity-tile-loader.svg)](https://www.npmjs.com/package/@mappable-world/mappable-entity-tile-loader)

## How use

The package is located in the `dist` folder:

- `dist/types` TypeScript types
- `dist/esm` es6 modules for direct connection in your project
- `dist/index.js` Mappable JS Module

to use Mappable JS Module you need to add your module loading handler to JS API

```js
mappable.import.loaders.unshift(async (pkg) => {
  if (!pkg.includes('@mappable-world/mappable-entity-tile-loader')) {
    return;
  }

  if (location.href.includes('localhost')) {
    await mappable.import.script(`/dist/index.js`);
  } else {
    // You can use another CDN
    await mappable.import.script(`https://unpkg.com/${pkg}/dist/index.js`);
  }

  Object.assign(mappable, window[`${pkg}`]);
  return window[`${pkg}`];
});
```

and in your final code just use `mappable.import`

```js
const pkg = await mappable.import('@mappable-world/mappable-entity-tile-loader')
```
