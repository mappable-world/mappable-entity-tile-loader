import type TReact from 'react';
import type {MMapEntity} from '@mappable-world/mappable-types';
import type {CustomReactify} from '@mappable-world/mappable-types/reactify/reactify';
import type {
    GeojsonFeature,
    MMapEntityTileLoader as MMapEntityTileLoaderI,
    MMapEntityTileLoaderProps
} from '../MMapEntityTileLoader';
import throttle from 'lodash/throttle';

/**
 * Create reactified version of MMapEntityTileLoader module
 *
 * @example
 * ```jsx
 * <MMap location={LOCATION} ref={x => map = x}>
 *     <MMapDefaultSchemeLayer />
 *     <MMapDefaultFeaturesLayer />
 *     <MMapEntityTileLoader
 *          tileSize={TILE_SIZE}
 *          getFeatureId={useCallback((feature) => feature.id, [])}
 *          fetchTile={fetchTile}
 *          entity={useCallback(
 *              (feature) => (
 *                  <MMapFeature geometry={feature.geometry} properties={feature.properties} />
 *              ),
 *              []
 *          )}
 *          onFeatureAdd={useCallback((entity) => {
 *               setTotal((total) => total + entity.properties.area_sqkm);
 *          }, [])}
 *          onFeatureRemove={useCallback((entity) => {
 *              setTotal((total) => total - entity.properties.area_sqkm);
 *          }, [])}
 *     />
 * </MMap>
 * ```
 */

type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

type MMapEntityTileLoaderReactifiedProps = Prettify<
    Omit<MMapEntityTileLoaderProps, 'entity'> & {
        /** Function that returns MMapEntity react component to render feature*/
        entity: (feature: GeojsonFeature) => TReact.ReactElement;
    }
>;

type MMapEntityTileLoaderImperative = new (
    props: MMapEntityTileLoaderReactifiedProps
) => MMapEntity<MMapEntityTileLoaderReactifiedProps>;
type MMapEntityTileLoaderR = TReact.ForwardRefExoticComponent<
    MMapEntityTileLoaderReactifiedProps & TReact.RefAttributes<MMapEntity<MMapEntityTileLoaderReactifiedProps>>
>;

export const MMapEntityTileLoaderReactifyOverride: CustomReactify<MMapEntityTileLoaderI, MMapEntityTileLoaderR> = (
    MMapEntityTileLoaderI,
    {reactify, React}
) => {
    const MMapEntityTileLoaderReactified = reactify.entity(
        MMapEntityTileLoaderI as unknown as MMapEntityTileLoaderImperative
    );

    const FeaturesList = React.memo(
        ({
            features,
            getFeatureId,
            entity
        }: {
            features: GeojsonFeature[];
            entity: MMapEntityTileLoaderReactifiedProps['entity'];
            getFeatureId: MMapEntityTileLoaderReactifiedProps['getFeatureId'];
        }) => {
            return (
                <>
                    {features.map((feature) => (
                        <React.Fragment key={getFeatureId(feature)}>{entity(feature)}</React.Fragment>
                    ))}
                </>
            );
        }
    );

    const MMapEntityTileLoader = React.forwardRef<
        MMapEntity<MMapEntityTileLoaderReactifiedProps>,
        MMapEntityTileLoaderReactifiedProps
    >((props, ref) => {
        const [features, setFeatures] = React.useState<GeojsonFeature[]>([]);

        const updateFeaturesList = React.useMemo(() => throttle(setFeatures, props.delayExecution), []);

        const onFeatureAdd = React.useCallback(
            (feature: GeojsonFeature): false => {
                props.onFeatureAdd?.(feature);

                if (!features.includes(feature)) {
                    features.push(feature);
                }

                updateFeaturesList([...features]);

                return false;
            },
            [features]
        );

        const onFeatureRemove = React.useCallback(
            (feature: GeojsonFeature): false => {
                props.onFeatureRemove?.(feature);
                const index = features.indexOf(feature);
                if (index !== -1) {
                    features.splice(index, 1);
                }

                updateFeaturesList([...features]);

                return false;
            },
            [features]
        );

        return (
            <>
                <MMapEntityTileLoaderReactified
                    {...props}
                    ref={ref}
                    onFeatureAdd={onFeatureAdd}
                    onFeatureRemove={onFeatureRemove}
                />
                <FeaturesList features={features} getFeatureId={props.getFeatureId} entity={props.entity} />
            </>
        );
    });

    return MMapEntityTileLoader;
};
