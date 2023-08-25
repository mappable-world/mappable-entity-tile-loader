module.exports = {
    extends: ['./node_modules/@mappable-world/mappable-cli/.eslintrc.js'],
    "overrides": [
        {
            "files": ["example/common.js"],
            "rules": {
                "@typescript-eslint/no-unused-vars": ["off"]
            }
        }
    ]
};
