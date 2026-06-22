app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://mern-project-jade-mu.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
