const inverseTransform = function(transform) {
    let invDet = 1 / (transform.d * transform.d + transform.b * transform.b);
    return [
        [transform.d * invDet, -transform.c * invDet, (transform.c * transform.f - transform.e * transform.d) * invDet], 
        [-transform.b * invDet, transform.a * invDet, -(transform.a * transform.f - transform.e * transform.b) * invDet],
        [0, 0, (transform.a * transform.d - transform.b * transform.c) * invDet]
    ];
};

const transformPoint = function(point, matrix) {
    return [
        point[0] * matrix[0][0] + point[1] * matrix[0][1] + 1 * matrix[0][2],
        point[0] * matrix[1][0] + point[1] * matrix[1][1] + 1 * matrix[1][2]
    ];
};

const screenToWorld = function(point, transform) {
    return transformPoint(point, inverseTransform(transform));
};

const interpLinear = function(x1, x2, y1, y2, t) {
    t = t - x1;
    return y1 + (t / (x2 - x1)) * (y2 - y1);
};

const interpQuadratic = function(x1, x2, y1, y2, t) {
    t = t - x1;
    let dx = x2 - x1;
    let dx2 = dx * dx;
    return y1 + ((-((t - dx) * (t - dx)) + dx2) / dx2) * (y2 - y1);
};

const inRange = function(val, v1, v2) {
    return val > Math.min(v1, v2) && val < Math.max(v1, v2);
};