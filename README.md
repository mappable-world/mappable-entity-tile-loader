# @mappable-world/mappable-entity-tile-loader package

---

Mappable JS API package loading data by tiles

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
const {MMapFeature, MMapDefaultFeaturesLayer} = mappable;
const {MMapEntityTileLoader} = await mappable.import('@mappable-world/mappable-entity-tile-loader@1.0.0');

map.addChild(new MMapDefaultFeaturesLayer());

map.addChild(
  new MMapEntityTileLoader({
    tileSize: 256, // World is 256x256 pixels on 0 zoom in 3.0.
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

Constructor parameters `MMapEntityTileLoader`:

```ts
import type {GenericFeature, LngLat, MMapEntity} from '@mappable-world/mappable-types';

export type GeojsonFeature = GenericFeature<LngLat>;

export interface MMapEntityTileLoaderProps {
  /** Tile size in pixels. World is 256x256 pixels on 0 zoom in 3.0. */
  readonly tileSize: number;
  fetchTile: (args: {tx: number; ty: number; tz: number; signal: AbortSignal}) => Promise<GeojsonFeature[]>;
  getFeatureId: (feature: GeojsonFeature) => string;
  entity: (feature: GeojsonFeature) => MMapEntity<unknown>;
  onFeatureAdd: (feature: GeojsonFeature) => void | false;
  onFeatureRemove: (feature: GeojsonFeature) => void | false;
  delayDeletion?: number;
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
