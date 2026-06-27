import { Request, Response, NextFunction } from "express";
import { PerfilUsuario } from "@prisma/client";
import { verificarToken, TokenPayload } from "@/services/auth.service";

// Estende o tipo Request do Express para incluir o usuário autenticado.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: TokenPayload;
    }
  }
}

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token de autenticação não fornecido." });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    req.usuario = verificarToken(token);
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}

// Restringe o acesso a uma rota a um conjunto de perfis.
// Uso: router.post("/rota", autenticar, autorizar([PerfilUsuario.ADMINISTRADOR]), handler)
export function autorizar(perfisPermitidos: readonly PerfilUsuario[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: "Usuário não autenticado." });
    }

    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        erro: "Acesso negado. Seu perfil não tem permissão para esta ação.",
      });
    }

    next();
  };
}
