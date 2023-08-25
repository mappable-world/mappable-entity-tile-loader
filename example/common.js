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
    [54.58311, 25.9985],
    [56.30248, 24.47889]
];

const LOCATION = {bounds: BOUNDS};
const TILE_SIZE = 256;
const TEST_JSON = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_urban_areas.geojson';

let geojson = null;
async function getJson() {
    if (geojson === null) {
        geojson = await (await fetch(TEST_JSON)).json();
        geojson.features.forEach((feature, ix) => (feature.id = ix));
    }

    return geojson;
}

function makeTileGeometry(projection, {tx, ty, tz}) {
    const ntiles = 2 ** tz;
    const ts = (1 / ntiles) * 2;

    const x = (tx / ntiles) * 2 - 1;
    const y = -((ty / ntiles) * 2 - 1);

    const wc2ll = (wc) => projection.fromWorldCoordinates(wc);

    const coordinates = [
        [
            wc2ll({x: x, y: y}),
            wc2ll({x: x + ts, y: y}),
            wc2ll({x: x + ts, y: y - ts}),
            wc2ll({x: x, y: y - ts})
        ]
    ];

    return {type: 'Polygon', coordinates};
}

async function fetchTile({tx, ty, tz, signal}) {
    await new Promise((r) => setTimeout(r, 50 * Math.random()));
    signal.throwIfAborted();

    const tile = {type: 'Feature', geometry: makeTileGeometry(map.projection, {tx, ty, tz})};
    const json = await getJson();
    return json.features.filter((x) => turf.booleanIntersects(tile, x));
}
