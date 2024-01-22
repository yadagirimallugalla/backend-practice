import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "/public/temp");
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, this.filename + "-" + uniqueSuffix);

    // cb(null, file.originalname); //for storing with file original name
  },
});
export const upload = multer({ storage });
