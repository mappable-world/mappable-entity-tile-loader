import {LngLat, PixelCoordinates, Projection} from '@mappable-world/mappable-types';
import {computeTileBounds} from './computeTileBounds';

export function getTilesForViewport({
    projection,
    zoom,
    center,
    tileSize,
    size
}: {
    readonly projection: Projection;
    readonly zoom: number;
    readonly center: Readonly<LngLat>;
    readonly tileSize: number;
    readonly size: PixelCoordinates;
}) {
    const roundZoom = Math.floor(zoom);
    const scale = 2 ** (zoom - roundZoom);

    const worldCenter = projection.toWorldCoordinates([...center]);

    const worldPixelSize = 256;
    const pixelScale = (2 ** roundZoom / 2) * worldPixelSize;
    const pixelCenter = {x: (worldCenter.x + 1) * pixelScale, y: (1 - worldCenter.y) * pixelScale};

    const viewportTileBounds = computeTileBounds(pixelCenter, size, scale, tileSize);

    const result = [];
    for (let tx = viewportTileBounds.minX; tx <= viewportTileBounds.maxX; tx++) {
        for (let ty = viewportTileBounds.minY; ty <= viewportTileBounds.maxY; ty++) {
            result.push({tx, ty, tz: roundZoom});
        }
    }

    return result;
}
