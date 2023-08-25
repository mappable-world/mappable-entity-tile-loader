import type {LngLatBounds} from '@mappable-world/mappable-types/common/types';
import {MMap} from '@mappable-world/mappable-types';
import {GeojsonFeature, MMapEntityTileLoader} from './MMapEntityTileLoader';

function nextTick(): Promise<void> {
    return new Promise((resolve) => process.nextTick(() => resolve()));
}

describe('MMap smoke test', () => {
    const BOUNDS: LngLatBounds = [
        [53.20890963521473, 25.52765018907181],
        [57.444403818421854, 24.71096299361919]
    ];

    const FEATURES: GeojsonFeature[] = [
        // prettier-ignore
        {"type":"Feature","properties":{"scalerank":5,"area_sqkm":306.708,"featureclass":"Urban area"},"geometry":{"type":"Polygon","coordinates":[[[57.27808556501731,23.90505280201225],[57.27808556501731,23.90505280201225],[57.27808556501731,23.90505280201225],[57.61129520043531,23.803663641855593],[57.70147057478462,23.78490509693364],[57.701987339107546,23.77741201425131],[57.72234785343056,23.738137925709495],[57.63558312361249,23.720981350188595],[57.5452527199663,23.724004421477673],[57.49605675642445,23.768446153248675],[57.44365685408047,23.812913723235837],[57.36929446801247,23.830897121673402],[57.29126305525173,23.850999253834942],[57.27839562361106,23.89569936776742],[57.27808556501731,23.90505280201225]]]},"id":'1436'},
        // prettier-ignore
        {"type":"Feature","properties":{"scalerank":5,"area_sqkm":196.842,"featureclass":"Urban area"},"geometry":{"type":"Polygon","coordinates":[[[55.94121626162655,25.793981431577095],[55.94121626162655,25.793981431577095],[55.94121626162655,25.793981431577095],[56.02524214053315,25.9159894882182],[56.047359653554054,25.97722606048407],[56.04927168154887,25.976321722918968],[56.08833906436152,25.906610215757226],[56.06115726097599,25.81713247324386],[56.016663852772695,25.77157969817857],[55.95852786644434,25.744578762306062],[55.89264041527218,25.73791250254041],[55.87010949079294,25.743700262957105],[55.94121626162655,25.793981431577095]]]},"id":'1429'},
        // prettier-ignore
        {"type":"Feature","properties":{"scalerank":3,"area_sqkm":269.775,"featureclass":"Urban area"},"geometry":{"type":"Polygon","coordinates":[[[57.99638797387436,23.73444306080063],[57.99638797387436,23.73444306080063],[57.99638797387436,23.73444306080063],[58.120411411374846,23.71653717701149],[58.27766279483902,23.645120347584125],[58.28045332218278,23.62724030201113],[58.2766292661932,23.616336574797543],[58.270686476479625,23.612874253833994],[58.26128136580249,23.608740139250642],[58.209243198484586,23.589878241464106],[58.154879591713524,23.58429718677658],[58.114727003822736,23.61403697356056],[58.07865685408302,23.647807522063303],[58.01824710473383,23.657264309172717],[57.977060988197195,23.685893052662408],[57.98677615746806,23.721704820240674],[57.99638797387436,23.73444306080063]]]},"id":'1437'},
        // prettier-ignore
        {"type":"Feature","properties":{"scalerank":5,"area_sqkm":171.273,"featureclass":"Urban area"},"geometry":{"type":"Polygon","coordinates":[[[56.64060509626478,24.47028961842075],[56.64060509626478,24.47028961842075],[56.64060509626478,24.47028961842075],[56.774136997306954,24.334587307222293],[56.88736006045846,24.18371796314618],[56.861108432854195,24.170721340424763],[56.81826867048423,24.213380235281704],[56.783645460848675,24.266942857352234],[56.74736860537979,24.314175116467013],[56.70804284040565,24.358952745047915],[56.66148237491069,24.39631480559494],[56.61388838076988,24.431093044527373],[56.59156416201978,24.460109361259256],[56.58965213402499,24.48672272388957],[56.61435346866048,24.513129380790716],[56.64060509626478,24.47028961842075]]]},"id":'1434'}
    ];

    const LOCATION = {bounds: BOUNDS};

    let container: HTMLElement, map: MMap, total: number, tileLoader: MMapEntityTileLoader;

    beforeEach(() => {
        container = document.createElement('div');
        Object.assign(container.style, {width: `643px`, height: `856px`});
        document.body.appendChild(container);
        map = new mappable.MMap(container, {location: LOCATION}, [
            new mappable.MMapDefaultSchemeLayer({}),
            new mappable.MMapDefaultFeaturesLayer({})
        ]);

        total = 0;
        tileLoader = new MMapEntityTileLoader({
            delayDeletion: 0,
            tileSize: 256, // World is 256x256 pixels on 0 zoom in 3.0.
            getFeatureId: (feature) => feature.id,
            fetchTile: ({tx, ty}) => {
                if (tx === 167) {
                    switch (ty) {
                        case 107:
                            return Promise.resolve([FEATURES[0]]);
                        case 108:
                            return Promise.resolve([FEATURES[1]]);
                        case 109:
                            return Promise.resolve([FEATURES[2]]);
                    }
                }

                if (tx === 337) {
                    switch (ty) {
                        case 219:
                            return Promise.resolve([FEATURES[3]]);
                    }
                }

                return Promise.resolve([]);
            },

            entity: (feature) =>
                new mappable.MMapFeature({
                    id: feature.id as string,
                    geometry: feature.geometry,
                    properties: feature.properties
                }),
            onFeatureAdd: (feature) => {
                total += feature.properties.area_sqkm as number;
            },
            onFeatureRemove: (feature) => {
                total -= feature.properties.area_sqkm as number;
            }
        });

        map.addChild(tileLoader);
    });

    afterEach(() => {
        map.removeChild(tileLoader);
        map.destroy();
        container.remove();
    });

    it('should add several polygons on map', async () => {
        await nextTick();

        const tree = domToJson(map.container);
        expect(tree).toMatchSnapshot();

        // @ts-ignore We do not add public children
        expect(tileLoader.children.length).toEqual(0);
        expect(document.querySelectorAll('path').length).toEqual(3);
        expect(Math.round(total)).toEqual(773);
    });

    describe('Move map', () => {
        it('should load and render another features', async () => {
            map.setLocation({center: [57.859760289989055, 23.678781782281117], zoom: 9});
            await nextTick();

            const tree = domToJson(map.container);
            expect(tree).toMatchSnapshot();

            // @ts-ignore We do not add public children
            expect(tileLoader.children.length).toEqual(0);
            expect(document.querySelectorAll('path').length).toEqual(1);
            expect(total).toEqual(FEATURES[3].properties.area_sqkm);
        });
    });
});
