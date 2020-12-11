const deepGet = (map, path, def) => {
    const key = path[0];

    if (!(key in map)) {
        return def;
    }

    if (path.length === 1) {
        return map[key] || def;
    }

    return deepGet(map[key], path.slice(1), def);
};

module.exports = {
    deepGet,
};