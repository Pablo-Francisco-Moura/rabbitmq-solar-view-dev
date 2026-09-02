import { Router } from "express";
import { concessionarias } from "../concessionarias.js";

const router = Router();

router.get("/api/concessionarias", (_request, response) => {
  response.json(concessionarias);
});

export default router;
