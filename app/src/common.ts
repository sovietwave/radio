export const rnd = (len: number) => (Math.random() * len) | 0;

export const randword = (len = 20): string => {
    let s = "";
    const ltr = "qwertyuiopasdfghjklzxcvbnm";
    for (let i = 0; i < len; ++i) {
        s += ltr[rnd(ltr.length)];
    }
    return s;
};