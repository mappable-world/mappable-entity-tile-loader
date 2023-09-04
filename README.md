# @mappable-world/mappable-entity-tile-loader package

---

Mappable JS API package loading data by tiles.

Allows you to load and display on the map only those objects that are included in the tile areas
displayed on the map.

The data is loaded tile-by-tile, so you don't have to load all the data at once.

[![npm version](https://badge.fury.io/js/@mappable-world/mappable-entity-tile-loader.svg)](https://badge.fury.io/js/@mappable-world/mappable-entity-tile-loader)
[![npm](https://img.shields.io/npm/dm/@mappable-world/mappable-entity-tile-loader.svg)](https://www.npmjs.com/package/@mappable-world/mappable-entity-tile-loader)

## How use

The package is located in the `dist` folder:

- `dist/types` TypeScript types
- `dist/esm` es6 modules for direct connection in your project
- `dist/index.js` Mappable JS Module

to use Mappable JS Module you need to add your module loading handler to JS API

Recommended use `MMapEntityTileLoader` as usual npm package:

```sh
npm i @mappable-world/mappable-entity-tile-loader
```

and dynamic import

```js
const {MMapEntityTileLoader} = await import('@mappable-world/mappable-entity-tile-loader/dist/esm/index');
```

But you can use CDN:

### Development

```js
mappable.import.loaders.unshift(async (pkg) => {
  if (!pkg.startsWith('@mappable-world/mappable-entity-tile-loader')) {
    return;
  }

  await mappable.import.script(`./node_modules/@mappable-world/mappable-entity-tile-loader/dist/index.js`);

  return window[`${pkg}`];
});
```

### Production

```js
mappable.import.loaders.unshift(async (pkg) => {
  if (!pkg.includes('@mappable-world/mappable-entity-tile-loader')) {
    return;
  }

  // You can use another CDN
  await mappable.import.script(`https://unpkg.com/${pkg}/dist/index.js`);

  return window[`${pkg}`];
});
```

and in your final code just use `mappable.import`

```js
const {MMapFeature, MMapDefaultFeaturesLayer} = mappable;
const {MMapEntityTileLoader} = await mappable.import('@mappable-world/mappable-entity-tile-loader@1.0.0');

map.addChild(new MMapDefaultFeaturesLayer());

map.addChild(
  new MMapEntityTileLoader({
    /**
     * By default, when changing tiles, old points are immediately deleted.
     * But the same points may appear in the new tile, then there was no point in deleting them.
     * Set the delay for applying deletion operations
     */
    removalDelay: 500,

    tileSize: 256, // World is 256x256 pixels on 0 zoom in Mappable
    getFeatureId: (feature) => feature.id,
    fetchTile: ({tx, ty, tz, sginal}) => {
      return fetch(`https://geodata.example/${tx}/${ty}/${tz}`, {signal}).then((r) => r.json());
    },

    entity: (feature) =>
      new MMapFeature({id: feature.id.toString(), geometry: feature.geometry, properties: feature.properties}),

    onFeatureAdd: (feature) => {
      console.log(feature);
    },

    onFeatureRemove: (feature) => {
      console.log(feature);
    }
  })
);
```

## API

Constructor parameters `MMapEntityTileLoader`:

```ts
import type {GenericFeature, LngLat, MMapEntity} from '@mappable-world/mappable-types';

export type GeojsonFeature = GenericFeature<LngLat>;

export interface MMapEntityTileLoaderProps {
  /** Tile size in pixels. World is 256x256 pixels on 0 zoom in Mappable */
  readonly tileSize: number;

  /**
   * Function for loading data by tile, should return an array of GeoJSON features
   */
  fetchTile: (args: {tx: number; ty: number; tz: number; signal: AbortSignal}) => Promise<GeojsonFeature[]>;

  /**
   * Function for getting the id of the feature.
   */
  getFeatureId: (feature: GeojsonFeature) => string;

  /**
   * Function for creating an [MMapEntity](https://mappable.world/docs/js-api/ref/index.html#class-mmapentity) from a feature.
   */
  entity: (feature: GeojsonFeature) => MMapEntity<unknown>;

  /**
   * Function is called when a feature is added to the map.
   * If the function returns `false`, the feature will not be added to the map.
   * In this case, you should add the feature to the map yourself.
   */
  onFeatureAdd: (feature: GeojsonFeature) => void | false;

  /**
   * Function is called when a feature is removed from the map.
   * If the function returns `false`, the feature will not be removed from the map.
   * In this case, you should remove the feature from the map yourself.
   */
  onFeatureRemove: (feature: GeojsonFeature) => void | false;

  /**
   * By default, when changing tiles, old features are immediately deleted.
   * But the same points may appear in the new tile, then there was no point in deleting them.
   * Set the delay for applying deletion operations.
   * @default 0
   */
  removalDelay?: number;
}
```

And a React version:

```jsx
const BOUNDS = [
  [53.20890963521473, 25.52765018907181],
  [57.444403818421854, 24.71096299361919]
];

const LOCATION = {bounds: BOUNDS};

const [mappableReact] = await Promise.all([mappable.import('@mappable-world/mappable-reactify'), mappable.ready]);
const reactify = mappableReact.reactify.bindTo(React, ReactDOM);

const {MMap, MMapDefaultSchemeLayer, MMapDefaultFeaturesLayer, MMapControlButton, MMapControls, MMapFeature} =
  reactify.module(mappable);

const {useState, useCallback} = React;

const {MMapZoomControl} = reactify.module(await mappable.import('@mappable-world/mappable-controls@0.0.1'));

const {MMapEntityTileLoader} = reactify.module(await mappable.import('@mappable-world/mappable-entity-tile-loader'));

function App() {
  return (
    <MMap location={LOCATION} ref={(x) => (map = x)}>
      <MMapDefaultSchemeLayer />
      <MMapDefaultFeaturesLayer />
      <MMapControls position="right">
        <MMapZoomControl />
      </MMapControls>
      <MMapControls position="top">
        <MMapControlButton text={`urban area in loaded tiles: ${total.toFixed(2)} km2`} />
      </MMapControls>
      <MMapEntityTileLoader
        renderDelay={100}
        tileSize={TILE_SIZE}
        getFeatureId={useCallback((feature) => feature.id, [])}
        fetchTile={fetchTile}
        entity={useCallback(
          (feature) => (
            <MMapFeature id={feature.id.toString()} geometry={feature.geometry} properties={feature.properties} />
          ),
          []
        )}
        onFeatureAdd={useCallback((entity) => {
          setTotal((total) => total + entity.properties.area_sqkm);
        }, [])}
        onFeatureRemove={useCallback((entity) => {
          setTotal((total) => total - entity.properties.area_sqkm);
        }, [])}
      />
    </MMap>
  );
}
```

For react version, you can use `renderDelay` parameter, because react will call `render` function for each feature.
To avoid unnecessary calls, you can set the delay for applying the changes.
