// utils/jwt.js
// Decodes a JWT's payload on the client. Does NOT verify the signature —
// that's already been done server-side; this is just for reading the
// claims (id, role, etc.) that are already public inside the token.
export function decodeJwtPayload(token) {
    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(
            atob(base64)
                .split("")
                .map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
                .join("")
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}