// Token sessionStorage mein rakha hai: har browser tab ka apna login hota hai,
// is liye do accounts ek hi browser ke do tabs mein test ho sakte hain.
// (Tab band karne par login khatam. Chahiye to sessionStorage ko localStorage kar do.)
const KEY = "token";
export const getToken = () => sessionStorage.getItem(KEY);
export const setToken = (t) => sessionStorage.setItem(KEY, t);
export const clearToken = () => sessionStorage.removeItem(KEY);
