import bcrypt from "bcryptjs";

export const hashPassword = async (password, salt) => {
    if(!password || typeof password !== "string") {
        return false;
    }
    return bcrypt.hash(password, salt);
};

export const comparePassword = async (password, storedPassword) => {
    if (typeof storedPassword !== "string" || !storedPassword) {
        return false;
    }
    return bcrypt.compare(password, storedPassword);
};