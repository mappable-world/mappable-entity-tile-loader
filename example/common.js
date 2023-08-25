mappable.import.loaders.unshift(async (pkg) => {
    if (!pkg.includes('@mappable-world/mappable-entity-tile-loader')) {
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

const BOUNDS = [
    [53.20890963521473, 25.52765018907181],
    [57.444403818421854, 24.71096299361919]
];
const ZOOM_RANGE = {min: 4, max: 10};
const LOCATION = {bounds: BOUNDS};
const TILE_SIZE = 256;
const TEST_JSON = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_urban_areas.geojson';
const TEST_TILE_SERVER = 'https://mappable-test-server-d7778c5d7460.herokuapp.com';

let geojson = null;

/**
 * Loading test data
 * @returns {Promise<*>}
 */
async function getJson() {
    if (geojson === null) {
        geojson = await (await fetch(TEST_JSON)).json();
        geojson.features.forEach((feature, ix) => (feature.id = ix));
    }

    return geojson;
}

/**
 * For the turf library, we generate a rectangular geojson to calculate point intersections
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

async function fetchTestTile({tx, ty, tz, signal}) {
    // For testing purposes only, we are emulating data downloads over the network
    await new Promise((r) => setTimeout(r, 50 * Math.random()));
    signal.throwIfAborted();

    const tile = {type: 'Feature', geometry: makeTileGeometry(map.projection, {tx, ty, tz})};
    const json = await getJson();
    return json.features.filter((x) => turf.booleanIntersects(tile, x));
}




const cache = new Map();
async function fetchRealRemoteTile({tx, ty, tz, signal}) {
    const key = `${tx}-${ty}-${tz}`;
    if (cache.has(key)) {
        return cache.get(key);
    }

    const data = await fetch(TEST_TILE_SERVER + '/v1/tile', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            x: tx,
            y: ty,
            z: tz
        }),
        signal
    }).then(resp => resp.json());
    signal.throwIfAborted();

    const features = [...data.features];

    cache.set(key, features);

    return features;
}
