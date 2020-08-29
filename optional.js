// Utility module for optional parameters

const optional = function(obj, key, defaultVal) {
    if(obj !== undefined && obj.hasOwnProperty("key")) {
        return obj[key];
    } else {
        return defaultVal;
    }
};

module.exports = optional;