export type ExtractEnv = "local" | "prod";

// Resultado bruto da API de extracao: renderizado via JSON.stringify, o
// frontend nunca le campos especificos.
export type ExtractResult = Record<string, unknown>;
