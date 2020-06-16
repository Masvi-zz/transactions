import path from "path";
import multer from "multer";
import crypto from "crypto";

export default {
    storage: multer.diskStorage({
        destination: path.resolve(__dirname, "..", "..", "temp"), // pasta do destino da imagem
        filename(request, file, callback) {
            const fileHash = crypto.randomBytes(10).toString("hex"); // gera um texto aleatório de 10b, hexadecimal
            const fileName = `${fileHash}-${file.originalname}`;

            return callback(null, fileName);
        },
    }),
};
