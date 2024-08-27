declare module '@mappable-world/mappable-types/import' {
    interface Import {
        (pkg: '@mappable-world/mappable-entity-tile-loader'): Promise<typeof import('./index')>;
    }
}

export {};
