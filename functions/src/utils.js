const deepGet = (map, path, def) => {
    if (!Array.isArray(path)) {
        throw new TypeError('path should be an Array');
    }

    const key = path[0];

    if (typeof(map) !== 'object' || !(key in map)) {
        return def;
    }

    if (path.length === 1) {
        if (key in map) {
            return map[key];
        }
        return def;
    }

    return deepGet(map[key], path.slice(1), def);
};

module.exports = {
    deepGet,
};