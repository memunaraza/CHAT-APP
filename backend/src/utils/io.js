// Socket.IO instance ko controllers mein use karne ke liye
let io = null;
export const setIO = (instance) => {
  io = instance;
};
export const getIO = () => io;
