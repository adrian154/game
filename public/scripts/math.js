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

// From StackOverflow:
// https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
const intersectsComponent = function(a, b, c, d, p, q, r, s) {
    let det, gamma, lambda;
    det = (c - a) * (s - q) - (r - p) * (d - b);

    if (det === 0) {
        return false;
    } else {
        lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
        gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
  };

// Line segment intersection
const intersects = function(a1, a2, b1, b2) {
    return intersectsComponent(a1[0], a1[1], a2[0], a2[1], b1[0], b1[1], b2[0], b2[1]);
}