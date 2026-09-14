import express from "express";
import cors from "cors";
import concessionariasRoutes from "./routes/concessionarias.js";
import queuesRoutes from "./routes/queues.js";
import unidadesRoutes from "./routes/unidades.js";
import gestaoSceeRoutes from "./routes/gestaoScee.js";
import extractRoutes from "./routes/extract.js";
import portaisRoutes from "./routes/portais.js";

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use(concessionariasRoutes);
app.use(queuesRoutes);
app.use(unidadesRoutes);
app.use(gestaoSceeRoutes);
app.use(extractRoutes);
app.use(portaisRoutes);

app.listen(port, () =>
  console.log(`RabbitMQ Solar View Dev API ouvindo em :${port}`),
);
