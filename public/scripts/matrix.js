const make2DArr = function(rows, cols) {

    let result = new Array(rows);
    
    for(let r = 0; r < rows; r++) {
        result[r] = new Array(cols);
    }

    return result;

};

const getCol = function(matrix, col) {

    let result = new Array(matrix.length);
    for(let i = 0; i < result.length; i++) {
        result[i] = matrix[i][col];
    }

    return result;

};

const dot = function(vec1, vec2) {

    if(vec1.length !== vec2.length) throw new Error("Can't take dot product of unequal length vectors!");

    let result = 0;
    for(let i = 0; i < vec1.length; i++) {
        result += vec1[i] * vec2[i];
    }

    return result;

};

const mulMatrix = function(m1, m2) {

    let result = make2DArr(m1.length, m2[0].length);
    for(let r = 0; r < m1.length; r++) {
        let row = m1[r];
        for(let c = 0; c < m2[0].length; c++) {
            let col = getCol(m2, c);
            result[r][c] = dot(row, col);
        }
    }

    return result;

};


const transformToMatrix = function(transform) {
    return [[transform.a, transform.c, transform.e], [transform.b, transform.d, transform.f], [0, 0, 1]];
};

const det3x3 = function(matrix) {

    if(matrix.length !== 3 || matrix[0].length !== 3) throw new Error("Matrix is not 3 by 3");

    return matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
        matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
        matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);

}

const det2x2p = function(a, b, c, d) {
    return a*d - b*c;
};

const minors3x3 = function(matrix) {

    if(matrix.length !== 3 || matrix[0].length !== 3) throw new Error("Matrix is not 3 by 3!");

    let result = make2DArr(3, 3);

    for(let r = 0; r < 3; r++) {
        for(let c = 0; c < 3; c++) {

            // Exclude current r, c.
            let tmp = [];
            for(let r2 = 0; r2 < 3; r2++) {
                for(let c2 = 0; c2 < 3; c2++) {
                    if(r2 == r || c2 == c) continue;
                    tmp.push(matrix[r2][c2]);
                }
            }

            // this is disgusting
            result[r][c] = det2x2p(...tmp);

        }
    }

    return result;

};

const makeCofactors = function(matrix) {

    for(let r = 0; r < matrix.length; r++) {
        for(let c = 0; c < matrix[0].length; c++) {
            let val = ((r % 2) ^ (c % 2)) == 0 ? 1 : -1;
            matrix[r][c] *= val;
        }
    }

    return matrix;

};

const transpose = function(matrix) {

    let result = make2DArr(matrix[0].length, matrix.length);

    for(let r = 0; r < matrix.length; r++) {
        for(let c = 0; c < matrix[r].length; c++) {
            result[c][r] = matrix[r][c];
        }
    }

    return result;

};

const mulScalar = function(matrix, scalar) {

    for(let r = 0; r < matrix.length; r++) {
        for(let c = 0; c < matrix[r].length; c++) {
            matrix[r][c] *= scalar;
        }
    }
    return matrix;

};

const invertMatrix3x3 = function(matrix) {

    if(matrix.length !== 3 || matrix[0].length !== 3) throw new Error("Matrix must be 3 by 3!");

    let det = det3x3(matrix);
    return mulScalar(transpose(makeCofactors(minors3x3(matrix))), 1 / det);

};

const makeTransformFull = function (x, y, scale, rotation) {
    return {
        a: Math.cos(rotation),
        c: -Math.sin(rotation),
        b: Math.sin(rotation),
        d: Math.cos(rotation),
        e: x,
        f: y
    };
};

const makeTransformFast = function(x, y, scale) {
    return {
        a: 1 * scale,
        b: 0,
        c: 0,
        d: 1 * scale,
        e: x,
        f: y
    }
};