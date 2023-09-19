mappable.import.loaders.unshift(async (pkg) => {
    if (!pkg.startsWith('@mappable-world/mappable-entity-tile-loader')) {
        return;
    }

    if (location.href.includes('localhost')) {
        await mappable.import.script(`/dist/index.js`);
    } else {
        await mappable.import.script(`https://unpkg.com/${pkg}/dist/index.js`);
    }

    Object.assign(mappable, window[`${pkg}`]);
    return window[`${pkg}`];
});

const SEARCH_PARAMS = new URLSearchParams(window.location.search);

const BOUNDS = [
    [53.20890963521473, 25.52765018907181],
    [57.444403818421854, 24.71096299361919]
];
const ZOOM_RANGE = {min: 4, max: 10};
const LOCATION = {bounds: BOUNDS};
const TILE_SIZE = 256;
const TEST_JSON = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_urban_areas.geojson';
const TEST_TILE_SERVER = 'https://mappable-test-server-d7778c5d7460.herokuapp.com';
const IS_TILE_CLUSTER = Boolean(SEARCH_PARAMS.get('byCluster'));

let geojson = null;

/**
 * Load the test json file
 * @returns {Promise<object>}
 */
async function getJson() {
    if (geojson === null) {
        geojson = await (await fetch(TEST_JSON)).json();
        geojson.features.forEach((feature, ix) => (feature.id = ix));
    }

    return geojson;
}

/**
 * In order to find in the array all the points that lie inside the tile, you need to
 * - translate tile coordinates `x`, `y`, `z` into world coordinates (in terms of `mappable`)
 * - convert world coordinates to geographic coordinates (Web Mercator)
 * From the obtained geographic coordinates, you can build a tile rectangle
 * and use it to search for intersections in an array of points.
 * For this we will use the turf.js library
 *
 * ```js
 * const tile = {type: 'Feature', geometry: makeTileGeometry(map.projection, {tx, ty, tz})};
 * const json = await getJson();
 * const points = json.features.filter((x) => turf.booleanIntersects(tile, x));
 * ```
 *
 * @param projection
 * @param tx
 * @param ty
 * @param tz
 * @returns {{coordinates: *[][], type: string}}
 */
function makeTileGeometry(projection, {tx, ty, tz}) {
    const ntiles = 2 ** tz;
    const ts = (1 / ntiles) * 2;

    const x = (tx / ntiles) * 2 - 1;
    const y = -((ty / ntiles) * 2 - 1);

    const wc2ll = (wc) => projection.fromWorldCoordinates(wc);

    const coordinates = [
        [wc2ll({x: x, y: y}), wc2ll({x: x + ts, y: y}), wc2ll({x: x + ts, y: y - ts}), wc2ll({x: x, y: y - ts})]
    ];

    return {type: 'Polygon', coordinates};
}

/**
 * Function to fetch a tile from the test json file.
 * It is not real network request, but it is emulated by a timeout.
 *
 * @param tx
 * @param ty
 * @param tz
 * @param signal
 * @returns {Promise<T[]>}
 */
async function fetchTestTile({tx, ty, tz, signal}) {
    // For testing purposes only, we are emulating data downloads over the network
    await new Promise((r) => setTimeout(r, 50 * Math.random()));
    signal.throwIfAborted();

    const tile = {type: 'Feature', geometry: makeTileGeometry(map.projection, {tx, ty, tz})};
    const json = await getJson();
    return json.features.filter((x) => turf.booleanIntersects(tile, x));
}

const cache = new Map();

/**
 * Function to fetch a tile from real remote server.
 *
 * @param tx
 * @param ty
 * @param tz
 * @param signal
 * @returns {Promise<any|*[]>}
 */
async function fetchRealRemoteTile({tx, ty, tz, signal}) {
    const key = `${tx}-${ty}-${tz}`;
    if (cache.has(key)) {
        return cache.get(key);
    }

    let features = [];

    try {
        const data = await fetch(
            `${TEST_TILE_SERVER}/v1/tile${IS_TILE_CLUSTER ? '-clusterer' : ''}?x=${tx}&y=${ty}&z=${tz}`,
            {
                signal
            }
        ).then((resp) => resp.json());
        signal.throwIfAborted();

        features = [...data.features];

        cache.set(key, features);
    } catch (e) {
        console.error(e);
    }

    return features;
}
