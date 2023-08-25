import {PixelCoordinates} from "@mappable-world/mappable-types";

export const computeTileBounds = (
    pixelCenter: PixelCoordinates,
    viewportSize: PixelCoordinates,
    scale: number,
    tileSize: number
) => {
    const halfViewportSize = {x: viewportSize.x / (2 * scale), y: viewportSize.y / (2 * scale)};

    let topLeftTile = {x: pixelCenter.x - halfViewportSize.x, y: pixelCenter.y - halfViewportSize.y};
    topLeftTile = {x: topLeftTile.x / tileSize, y: topLeftTile.y / tileSize};
    topLeftTile = {x: Math.floor(topLeftTile.x), y: Math.floor(topLeftTile.y)};

    let bottomRightTile = {x: pixelCenter.x + halfViewportSize.x, y: pixelCenter.y + halfViewportSize.y};
    bottomRightTile = {x: bottomRightTile.x / tileSize, y: bottomRightTile.y / tileSize};
    bottomRightTile = {x: Math.floor(bottomRightTile.x), y: Math.floor(bottomRightTile.y)};

    return {
        minX: topLeftTile.x,
        minY: topLeftTile.y,
        maxX: bottomRightTile.x,
        maxY: bottomRightTile.y
    };
};
