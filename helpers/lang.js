module.exports.plural = function (i, str1, str2, str3) {
    function plural(a) {
        if (a % 10 == 1 && a % 100 != 11) return 0;
        else if (a % 10 >= 2 && a % 10 <= 4 && ( a % 100 < 10 || a % 100 >= 20)) return 1;
        else return 2;
    }

    switch (plural(i)) {
        case 0:
            return str1;
        case 1:
            return str2;
        default:
            return str3;
    }
};
