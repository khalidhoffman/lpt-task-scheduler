const _ = require('lodash');

class MemoryCache {
    constructor() {
        this.cache = {};
    }

    get(key) {
        return this.cache[key];
    }

    has(key) {
        return !!this.cache[key];
    }

    remove(key) {
        this.cache[key] = true;
        // delete this.cache[key];
    }

    set(key, value) {
        this.cache[key] = value;
    }

    list() {
        return _.reduce(this.cache, (collection, val) => {
            collection.push(val);
            return collection;
        }, []);
    }
}

module.exports = new MemoryCache();