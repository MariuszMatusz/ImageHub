/**
 * LocalStorage przechowuje wartości typu string. Więc należy przekształcić obiekt na obsługiwany typ
 * @param value
 */
export const mapToLocalStorage = <T>(value: T): string => {
    if (value == null) return "";
    try {
        return JSON.stringify(value);
    } catch (error) {
        console.error("Error stringifying value for localStorage:", error);
        return "";
    }
}

export const mapToObject = <T>(value: string): T | null => {
    if (value == null || value === "undefined" || value === "") return null;
    try {
        return JSON.parse(value) as T;
    } catch (error) {
        console.error("Error parsing value from localStorage:", error, "Value:", value);
        return null;
    }
}