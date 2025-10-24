import express from "express";
import { engine } from "express-handlebars";
import hbs_sections from "express-handlebars-sections";
import studentRoute from "./routes/student.route.js";
import database from "./utils/database.js";

const app = express();
const __dirname = import.meta.dirname;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.engine(
  "handlebars",
  engine({
    helpers: {
      fill_section: hbs_sections(),
      formatNumber(v) {
        return new Intl.NumberFormat("en-US").format(v);
      },
      eq(a, b) {
        return a === b;
      },
    },
  })
);
app.set("view engine", "handlebars");
app.set("views", __dirname + "/views");

// ✅ DEV-LOGIN: lấy 1 user role=student để test
app.use(async (req, res, next) => {
  if (!req.session) req.session = {};
  if (!req.session.user) {
    const user = await database("users")
      .where({ email: "jason@academy.com" }) 
      .first("id", "name", "email");
    req.session.user = user;
    // {id, name, email}
  }
  res.locals.authUser = req.session.user;
  next();
});


app.use("/student", studentRoute);

const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

export default app;
