import type {GenericFeature, LngLat, MMapEntity} from '@mappable-world/mappable-types';

import {MMapListener} from '@mappable-world/mappable-types';
import {MMapEntityTileLoaderReactifyOverride} from './react/MMapEntityTileLoader';
import {getTilesForViewport} from './helpers/getTilesForViewport';
import throttle from 'lodash/throttle';

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

interface Tile {
    tx: number;
    ty: number;
    tz: number;
    abortController: AbortController;
    entities: Map<string, SharedFeature>;
    promise: Promise<void>;
}

interface SharedFeature {
    id: string;
    refcount: number;
    feature: GeojsonFeature;
    entity?: MMapEntity<unknown>;
}

export class MMapEntityTileLoader extends mappable.MMapComplexEntity<MMapEntityTileLoaderProps> {
    static [mappable.overrideKeyReactify] = MMapEntityTileLoaderReactifyOverride;

    private _tiles = new Map<string, Tile>();
    private _features = new Map<string, SharedFeature>();
    private _listener: MMapListener;
    private _requestDeleteFeatures: Function;

    constructor(props: MMapEntityTileLoaderProps) {
        super({removalDelay: 0, ...props}, {container: true});

        this._listener = new mappable.MMapListener({
            onUpdate: ({mapInAction}) => {
                if (!mapInAction) {
                    this._reconcileTiles();
                }
            }
        });

        this._addDirectChild(this._listener);

        this._requestDeleteFeatures = this._props.removalDelay
            ? throttle(() => this._deleteFeatures(), this._props.removalDelay)
            : () => this._deleteFeatures();
    }

    protected override _onUpdate({removalDelay}: Partial<MMapEntityTileLoaderProps>) {
        if (removalDelay !== undefined) {
            this._requestDeleteFeatures = removalDelay
                ? throttle(() => this._deleteFeatures(), removalDelay)
                : () => this._deleteFeatures();
        }
    }

    protected _onDetach() {
        for (const child of this.children) {
            this.removeChild(child);
        }

        this._tiles.clear();
        this._features.clear();
    }

    protected _onAttach() {
        this._reconcileTiles();
    }

    private _markedForDeletion: Set<SharedFeature> = new Set();

    private _reconcileTiles() {
        const {projection, zoom, center, size} = this.root!;
        const tilesForViewport = getTilesForViewport({
            projection,
            zoom,
            center,
            size,
            tileSize: this._props.tileSize
        });

        const tiles = new Map();
        for (const tile of tilesForViewport) {
            tiles.set(`${tile.tx}_${tile.ty}_${tile.tz}`, tile);
        }

        // Add new
        for (const [key, description] of tiles.entries()) {
            if (this._tiles.has(key)) continue;

            const tile: Tile = {
                ...description,
                abortController: new AbortController(),
                entities: new Map(),
                promise: Promise.resolve()
            };

            tile.promise = this._fetchTile(tile);

            this._tiles.set(key, tile);
        }

        // Remove old tiles and features
        for (const [key, tile] of this._tiles.entries()) {
            if (tiles.has(key)) continue;
            this._tiles.delete(key);

            for (const sharedEntity of tile.entities.values()) {
                sharedEntity.refcount--;
                if (sharedEntity.refcount === 0) {
                    this._markedForDeletion.add(sharedEntity);
                }
            }

            tile.abortController.abort();
        }

        this._requestDeleteFeatures();
    }

    private async _fetchTile(tile: Tile): Promise<void> {
        const [ok, featuresOrError] = await this._props
            .fetchTile({tx: tile.tx, ty: tile.ty, tz: tile.tz, signal: tile.abortController.signal})
            .then(
                (data) => [true, data],
                (error) => [false, error]
            );

        if (!ok || !Array.isArray(featuresOrError)) {
            if (
                !featuresOrError ||
                (featuresOrError instanceof DOMException && featuresOrError.name === 'AbortError')
            ) {
                return;
            }
            throw featuresOrError;
        }

        for (const feature of featuresOrError) {
            const id = this._props.getFeatureId(feature);
            if (tile.entities.has(id)) continue;

            const existingFeature = this._features.get(id);
            const sharedFeature = existingFeature ?? {
                id,
                feature,
                refcount: 0
            };

            sharedFeature.refcount++;
            tile.entities.set(id, sharedFeature);

            if (!existingFeature) {
                this._features.set(id, sharedFeature);
                this.__addFeature(sharedFeature);
            }
        }
    }

    private _deleteFeatures() {
        this._markedForDeletion.forEach((sharedEntity) => {
            if (sharedEntity.refcount !== 0) {
                return;
            }

            this._features.delete(sharedEntity.id);
            this.__removeFeature?.(sharedEntity);
        });

        this._markedForDeletion.clear();
    }

    private __addFeature(sharedEntity: SharedFeature): void {
        if (this._props.onFeatureAdd?.(sharedEntity.feature) === false) {
            return;
        }

        if (!sharedEntity.entity) {
            sharedEntity.entity = this._props.entity(sharedEntity.feature);
        }

        this._addDirectChild(sharedEntity.entity);
    }

    private __removeFeature(sharedEntity: SharedFeature): void {
        if (this._props.onFeatureRemove?.(sharedEntity.feature) === false) {
            return;
        }

        this._removeDirectChild(sharedEntity.entity);
    }
}
