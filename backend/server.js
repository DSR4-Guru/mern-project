const cors = require("cors");

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        "http://localhost:5173",
        "https://mern-project-jade-mu.vercel.app",
      ];

      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, true); // TEMP: allow all for debugging
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
