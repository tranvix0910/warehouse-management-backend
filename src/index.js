import express from "express";

const app = express();

const port = 5000;

app.listen(port, () => {
  console.log(`connect sever successful at http://localhost:${port}`);
});
